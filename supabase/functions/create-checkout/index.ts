
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Subscription tiers configuration
const SUBSCRIPTION_LIMITS = {
  single: { posts: 1, price: 10000 },   // 100 SEK
  basic: { posts: 5, price: 35000 },    // 350 SEK
  standard: { posts: 15, price: 75000 }, // 750 SEK
  premium: { posts: 999, price: 120000 } // 1200 SEK (effectively unlimited)
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use the test key from environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY är inte inställd");
    }
    
    logStep("Retrieved Stripe key", { keyLength: stripeKey.length, keyStart: stripeKey.substring(0, 10) + "..." });
    
    // Strict check for test key
    if (!stripeKey.startsWith('sk_test_')) {
      logStep("ERROR: Not using a test key - stopping execution", { keyPrefix: stripeKey.substring(0, 7) + "..." });
      return new Response(JSON.stringify({ 
        error: "Endast testnycklar tillåtna för Stripe",
        details: "Kontrollera att STRIPE_SECRET_KEY i Supabase börjar med 'sk_test_'" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    } else {
      logStep("Using Stripe test key ✓");
    }

    // Create Supabase client with service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      const { plan } = requestData;
      logStep("Request body parsed", { plan, requestData });

      if (!plan || !SUBSCRIPTION_LIMITS[plan as keyof typeof SUBSCRIPTION_LIMITS]) {
        throw new Error("Ogiltig plan angiven");
      }
    } catch (parseError) {
      logStep("Request body parse error", { error: parseError.message });
      throw new Error("Kunde inte tolka förfrågan: " + parseError.message);
    }
    
    const { plan } = requestData;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Auktoriseringsheader saknas");
    }
    
    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length });
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error", { error: userError.message });
      throw new Error(`Autentiseringsfel: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("Användaren är inte autentiserad eller email saknas");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe with the test key
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer already exists
    logStep("Looking for existing customer", { email: user.email });
    let customerId;
    
    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      } else {
        // Create new customer
        logStep("Creating new customer", { email: user.email });
        const customer = await stripe.customers.create({ 
          email: user.email,
          metadata: { user_id: user.id },
          name: user.user_metadata?.company_name || user.user_metadata?.name || "Företag"
        });
        customerId = customer.id;
        logStep("New customer created", { customerId });
      }
    } catch (stripeError) {
      logStep("Stripe customer error", { error: stripeError.message });
      throw new Error("Fel vid hantering av Stripe-kund: " + stripeError.message);
    }

    try {
      // Get the plan configuration
      const planConfig = SUBSCRIPTION_LIMITS[plan as keyof typeof SUBSCRIPTION_LIMITS];
      const amount = planConfig.price;
      const isSubscription = plan !== 'single';
      
      logStep("Creating checkout session in TEST MODE", { 
        customer: customerId, 
        mode: isSubscription ? "subscription" : "payment",
        amount: amount,
        plan: plan,
        postLimit: planConfig.posts
      });
      
      // Create a session with dynamic line items instead of using price IDs
      const lineItems = [{
        price_data: {
          currency: 'sek',
          product_data: {
            name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} ${isSubscription ? 'Prenumeration' : 'Köp'}`,
            description: `${isSubscription ? 'Månatlig prenumeration' : 'Engångsköp'} för ${plan} plan`,
          },
          unit_amount: amount,
          ...(isSubscription ? { recurring: { interval: 'month' } } : {})
        },
        quantity: 1,
      }];
      
      let session;
      try {
        session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ["card"],
          line_items: lineItems,
          mode: isSubscription ? "subscription" : "payment",
          allow_promotion_codes: true,
          billing_address_collection: "auto",
          customer_update: {
            address: 'auto',
            name: 'auto'
          },
          tax_id_collection: { enabled: true },
          automatic_tax: { enabled: true },
          metadata: {
            user_id: user.id,
            plan: plan,
            post_limit: planConfig.posts
          },
          success_url: `${req.headers.get("origin")}/dashboard?payment_success=true&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${req.headers.get("origin")}/pricing?payment_cancelled=true`,
        });
      } catch (sessionError) {
        logStep("Checkout session creation error", { error: sessionError.message });
        
        // Check if this is a card declined error
        if (sessionError.message?.includes('card declined')) {
          return new Response(JSON.stringify({ 
            error: "Kortet nekades. Använd giltigt testkort (t.ex. 4242 4242 4242 4242)"
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        
        throw new Error("Kunde inte skapa betalningssession: " + sessionError.message);
      }

      logStep("Checkout session created in TEST MODE", { sessionId: session.id, sessionUrl: session.url });

      // Store the pending order in Supabase - don't block the checkout flow if this fails
      try {
        // First, update the subscribers table
        const { error: insertError } = await supabaseClient.from("subscribers").upsert({
          user_id: user.id,
          email: user.email,
          stripe_customer_id: customerId,
          subscription_tier: plan,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        if (insertError) {
          logStep("Database insertion warning", { error: insertError.message });
          console.warn("Warning: Failed to update subscriber record:", insertError);
        } else {
          logStep("Subscriber record updated successfully");
        }

        // Then, update the job_posting_limits table using the database function
        const { error: limitError } = await supabaseClient.rpc("update_subscription_tier", {
          user_id: user.id,
          tier: plan,
          post_limit: planConfig.posts
        });

        if (limitError) {
          logStep("Database limits update warning", { error: limitError.message });
          console.warn("Warning: Failed to update subscription limits:", limitError);
        } else {
          logStep("Subscription limits updated successfully", { tier: plan, postLimit: planConfig.posts });
        }
      } catch (dbError) {
        // Don't fail the checkout if database update fails
        logStep("Database operation error", { error: dbError.message });
        console.error("Database error during subscriber update:", dbError);
      }

      // Return checkout URL
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
      
    } catch (stripeError) {
      logStep("Stripe error", { error: stripeError.message });
      throw new Error("Fel vid betalningsintegrering: " + stripeError.message);
    }
    
  } catch (error) {
    // Comprehensive error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'Unknown error';
    
    console.error("Error creating checkout session:", errorMessage);
    logStep("ERROR in create-checkout", { 
      message: errorMessage,
      stack: errorStack
    });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorStack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
