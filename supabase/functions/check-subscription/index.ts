
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Cache subscriptions in memory to improve response time for frequent checks
// This will be reset when the function cold starts
const subscriptionCache = new Map();
const CACHE_TTL = 20000; // 20 seconds cache TTL

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    // Check if we have a valid cached result
    const cacheKey = `${user.id}`;
    const cachedData = subscriptionCache.get(cacheKey);
    const requestBody = await req.json().catch(() => ({}));
    const forceFresh = requestBody.force_fresh === true;
    
    if (cachedData && !forceFresh && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      console.log("Returning cached subscription data");
      return new Response(JSON.stringify(cachedData.data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // First, check if the user has a Stripe customer ID
    let { data: existingSubscriber } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSubscriber?.stripe_customer_id;
    
    // If no customer ID found in our database, search by email in Stripe
    if (!customerId) {
      console.log("No customer ID in database, checking Stripe by email");
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      if (customers.data && customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log("Found customer in Stripe:", customerId);
      } else {
        // No customer exists in Stripe either
        console.log("No Stripe customer found for email", user.email);
        
        // Create or update the subscriber record to show no subscription
        await supabase.from("subscribers").upsert({
          user_id: user.id,
          email: user.email,
          subscribed: false,
          subscription_tier: "free",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
        
        const resultData = { 
          subscribed: false,
          subscription_tier: "free"
        };
        
        // Cache the result
        subscriptionCache.set(cacheKey, {
          data: resultData,
          timestamp: Date.now()
        });
        
        return new Response(JSON.stringify(resultData), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Now check for active subscriptions
    console.log("Checking for active subscriptions for customer:", customerId);
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10,
    });

    let isSubscribed = false;
    let subscriptionTier = "free";
    let subscriptionEnd = null;
    let subscriptionId = null;

    // Process subscription data
    if (subscriptions.data.length > 0) {
      const activeSubscription = subscriptions.data[0]; // Get the most recent active subscription
      
      isSubscribed = true;
      subscriptionId = activeSubscription.id;
      subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
      
      // Find the first subscription item with a price
      const item = activeSubscription.items.data[0];
      if (item) {
        const price = await stripe.prices.retrieve(item.price.id);
        const productId = price.product;
        
        // Get the product to determine the tier
        const product = await stripe.products.retrieve(productId.toString());
        
        // FIXED: Determine tier from product metadata or name more accurately
        if (product.metadata && product.metadata.tier) {
          subscriptionTier = product.metadata.tier.toLowerCase();
        } else {
          // Fall back to determine by product name
          const productName = product.name.toLowerCase();
          if (productName.includes('basic') || productName.includes('bas')) {
            subscriptionTier = 'basic';
          } else if (productName.includes('standard')) {
            subscriptionTier = 'standard';
          } else if (productName.includes('premium')) {
            subscriptionTier = 'premium';
          }
        }
        
        console.log(`Found active subscription: ${subscriptionId}, tier: ${subscriptionTier}, ends: ${subscriptionEnd}`);
      }
    } else {
      // Check if user has a one-time purchase (single plan)
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
          // Set an expiration date 30 days from charge date
          const chargeDate = new Date(singlePlanCharge.created * 1000);
          const expireDate = new Date(chargeDate);
          expireDate.setDate(chargeDate.getDate() + 30);
          subscriptionEnd = expireDate.toISOString();
          console.log(`Found single plan purchase, expires: ${subscriptionEnd}`);
        } else {
          console.log("No relevant subscription or single plan purchase found");
        }
      }
    }

    // Update database with subscription status
    const updateResult = await supabase.from("subscribers").upsert({
      user_id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
      subscribed: isSubscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      subscription_id: subscriptionId,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    
    if (updateResult.error) {
      console.error("Error updating subscriber record:", updateResult.error);
    } else {
      console.log("Subscriber record updated successfully");
    }

    // Update the job posting limits table to match
    if (isSubscribed) {
      let monthlyPostLimit = 1;
      if (subscriptionTier === 'basic') monthlyPostLimit = 5;
      else if (subscriptionTier === 'standard') monthlyPostLimit = 15;
      else if (subscriptionTier === 'premium') monthlyPostLimit = 999;
      else if (subscriptionTier === 'single') monthlyPostLimit = 1;
      
      const limitsResult = await supabase.from("job_posting_limits").upsert({
        user_id: user.id,
        subscription_tier: subscriptionTier,
        monthly_post_limit: monthlyPostLimit,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      
      if (limitsResult.error) {
        console.error("Error updating job posting limits:", limitsResult.error);
      } else {
        console.log("Job posting limits updated successfully");
      }
    }

    const resultData = {
      subscribed: isSubscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
    };
    
    // Cache the result
    subscriptionCache.set(cacheKey, {
      data: resultData,
      timestamp: Date.now()
    });

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
