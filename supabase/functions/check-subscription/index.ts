
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Cache subscriptions in memory to improve response time for frequent checks
const subscriptionCache = new Map();
const CACHE_TTL = 5000; // Reduced to 5 seconds for better real-time updates

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== CHECK SUBSCRIPTION STARTED ===");
    
    // Get the Stripe API key from environment
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("Missing STRIPE_SECRET_KEY in environment");
      throw new Error("STRIPE_SECRET_KEY is not set in the environment");
    }
    
    // Get authorization header
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ 
        error: "Missing authorization header. Please ensure you are logged in."
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Supabase client with service role for writing data
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""; 
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or key");
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });
    
    // Verify the user token
    const token = authorization.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ 
        error: userError ? userError.message : "Invalid user token"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Checking subscription status for user:", user.id, user.email);
    
    // Check for force refresh parameter
    const requestBody = await req.json().catch(() => ({}));
    const forceFresh = requestBody.force_fresh === true;
    
    // Check cache unless force refresh is requested
    const cacheKey = `${user.id}`;
    const cachedData = subscriptionCache.get(cacheKey);
    
    if (cachedData && !forceFresh && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      console.log("Returning cached subscription data for user:", user.id);
      return new Response(JSON.stringify(cachedData.data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Fetching fresh subscription data from Stripe for user:", user.id);

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // First, check if the user has a Stripe customer ID in our database
    const { data: existingSubscriber, error: subscriberError } = await supabase
      .from("subscribers")
      .select("stripe_customer_id, subscription_tier, subscribed, subscription_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriberError) {
      console.error('Error fetching subscriber data:', subscriberError);
    }

    let customerId = existingSubscriber?.stripe_customer_id;
    
    // If no customer ID found in our database, search by email in Stripe
    if (!customerId) {
      console.log("No customer ID in database, searching Stripe by email:", user.email);
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      if (customers.data && customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Found customer in Stripe:", customerId);
      } else {
        console.log("No Stripe customer found for email:", user.email);
        
        // Create or update the subscriber record to show no subscription
        const { error: upsertError } = await supabase
          .from("subscribers")
          .upsert({
            user_id: user.id,
            email: user.email,
            subscribed: false,
            subscription_tier: "free",
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        
        if (upsertError) {
          console.error("Error upserting subscriber record:", upsertError);
        } else {
          console.log("Created/updated free subscriber record successfully");
        }
        
        const resultData = { 
          subscribed: false,
          subscription_tier: "free",
          status: "inactive",
          plan_name: "free"
        };
        
        // Cache the result
        subscriptionCache.set(cacheKey, {
          data: resultData,
          timestamp: Date.now()
        });
        
        console.log("=== CHECK SUBSCRIPTION COMPLETED (FREE) ===");
        return new Response(JSON.stringify(resultData), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Now check for active subscriptions
    console.log("Checking for subscriptions for customer:", customerId);
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10, // Get all subscriptions to find the most recent active one
    });

    let isSubscribed = false;
    let subscriptionTier = "free";
    let planName = "free";
    let status = "inactive";
    let subscriptionEnd = null;
    let subscriptionId = null;

    // Process subscription data - prioritize active subscriptions
    if (subscriptions.data.length > 0) {
      // Sort by created date to get the most recent subscription
      const sortedSubscriptions = subscriptions.data.sort((a, b) => b.created - a.created);
      
      // Find the first active subscription, or use the most recent one
      const activeSubscription = sortedSubscriptions.find(sub => sub.status === 'active') || sortedSubscriptions[0];
      
      if (activeSubscription) {
        subscriptionId = activeSubscription.id;
        status = activeSubscription.status;
        isSubscribed = activeSubscription.status === 'active' || activeSubscription.status === 'trialing';
        subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
        
        console.log(`Found subscription: ${subscriptionId}, status: ${status}, ends: ${subscriptionEnd}`);
        
        // Find the first subscription item with a price
        const item = activeSubscription.items.data[0];
        if (item) {
          const price = await stripe.prices.retrieve(item.price.id);
          const productId = price.product;
          
          // Get the product to determine the tier
          const product = await stripe.products.retrieve(productId.toString());
          
          // Determine tier from product metadata or name
          if (product.metadata && product.metadata.tier) {
            subscriptionTier = product.metadata.tier.toLowerCase();
            planName = product.metadata.tier.toLowerCase();
          } else {
            // Fall back to determine by product name
            const productName = product.name.toLowerCase();
            if (productName.includes('basic') || productName.includes('bas')) {
              subscriptionTier = 'basic';
              planName = 'basic';
            } else if (productName.includes('standard')) {
              subscriptionTier = 'standard';
              planName = 'standard';
            } else if (productName.includes('premium')) {
              subscriptionTier = 'premium';
              planName = 'premium';
            } else if (productName.includes('single')) {
              subscriptionTier = 'single';
              planName = 'single';
            }
          }
          
          console.log(`Determined subscription tier: ${subscriptionTier}, plan: ${planName}`);
        }
      }
    } else {
      // Check if user has a one-time purchase (single plan)
      console.log("No subscriptions found, checking for one-time purchases");
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: 10,
      });
      
      if (charges.data.length > 0) {
        // Look for successful charges with a "single" plan metadata
        const singlePlanCharge = charges.data.find(charge => 
          charge.status === 'succeeded' && 
          charge.metadata && 
          charge.metadata.plan === 'single'
        );
        
        if (singlePlanCharge) {
          isSubscribed = true;
          subscriptionTier = 'single';
          planName = 'single';
          status = 'active';
          // Set an expiration date 30 days from charge date
          const chargeDate = new Date(singlePlanCharge.created * 1000);
          const expireDate = new Date(chargeDate);
          expireDate.setDate(chargeDate.getDate() + 30);
          subscriptionEnd = expireDate.toISOString();
          console.log(`Found single plan purchase, expires: ${subscriptionEnd}`);
        }
      }
    }

    // Always update the subscribers table with the latest information
    console.log("Updating subscriber record with:", {
      subscribed: isSubscribed,
      subscription_tier: subscriptionTier,
      status: status,
      plan_name: planName
    });
    
    const { error: upsertError } = await supabase
      .from("subscribers")
      .upsert({
        user_id: user.id,
        email: user.email,
        stripe_customer_id: customerId,
        subscribed: isSubscribed,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        subscription_id: subscriptionId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (upsertError) {
      console.error("Error updating subscriber record:", upsertError);
    } else {
      console.log("Subscriber record updated successfully");
    }

    // Update the job posting limits table to match
    if (isSubscribed && subscriptionTier !== 'free') {
      let monthlyPostLimit = 1;
      if (subscriptionTier === 'basic') monthlyPostLimit = 5;
      else if (subscriptionTier === 'standard') monthlyPostLimit = 15;
      else if (subscriptionTier === 'premium') monthlyPostLimit = 999;
      else if (subscriptionTier === 'single') monthlyPostLimit = 1;
      
      const { error: limitsError } = await supabase
        .from("job_posting_limits")
        .upsert({
          user_id: user.id,
          subscription_tier: subscriptionTier,
          monthly_post_limit: monthlyPostLimit,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (limitsError) {
        console.error("Error updating job posting limits:", limitsError);
      } else {
        console.log("Job posting limits updated successfully");
      }
    }

    const resultData = {
      subscribed: isSubscribed,
      subscription_tier: subscriptionTier,
      plan_name: planName,
      status: status,
      subscription_end: subscriptionEnd,
    };
    
    // Cache the result
    subscriptionCache.set(cacheKey, {
      data: resultData,
      timestamp: Date.now()
    });

    console.log("=== CHECK SUBSCRIPTION COMPLETED ===", resultData);
    return new Response(JSON.stringify(resultData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Subscription check error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to verify subscription",
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
