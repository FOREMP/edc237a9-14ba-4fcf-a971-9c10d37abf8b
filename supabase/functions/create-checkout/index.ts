
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

// Define the request body type
interface RequestBody {
  plan: string;
  test_mode?: boolean;
  return_url?: string;
  timestamp?: number;
}

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
      throw new Error("Missing authorization header");
    }

    // Get Supabase client
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.7.1");
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
    
    if (userError) {
      console.error("Auth error:", userError);
      throw new Error(`Invalid user token: ${userError.message}`);
    }
    
    if (!user) {
      console.error("No user found in token");
      throw new Error("No user found in token");
    }

    console.log("User authenticated:", user.id, user.email);

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      throw new Error("Failed to parse request body");
    }
    
    const { plan, test_mode = true, return_url = null, timestamp = Date.now() } = body;
    
    if (!plan) {
      console.error("No plan specified");
      throw new Error("No plan specified");
    }

    console.log("Payment request:", { plan, test_mode, timestamp });

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Check if the user already has a Stripe customer
    const { data: existingCustomer, error: customerError } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error("Error fetching customer info:", customerError);
    }

    let customerId;

    // Use existing customer ID if available
    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
      console.log("Using existing customer ID:", customerId);
    } else {
      // Check if customer exists in Stripe by email
      const existingStripeCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (existingStripeCustomers.data.length > 0) {
        customerId = existingStripeCustomers.data[0].id;
        console.log("Found customer in Stripe by email:", customerId);
        
        // Update subscriber record with customer ID
        await supabase
          .from("subscribers")
          .upsert({
            user_id: user.id,
            email: user.email,
            stripe_customer_id: customerId,
          });
      } else {
        // Create a new Stripe customer
        try {
          const newCustomer = await stripe.customers.create({
            email: user.email,
            metadata: {
              user_id: user.id,
            },
          });
          customerId = newCustomer.id;
          console.log("Created new customer:", customerId);
          
          // Store the new customer ID in database
          await supabase
            .from("subscribers")
            .upsert({
              user_id: user.id,
              email: user.email,
              stripe_customer_id: customerId,
            });
        } catch (error) {
          console.error("Failed to create Stripe customer:", error);
          throw new Error(`Failed to create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Set up prices based on plan
    let priceId;
    let mode = "subscription";

    // Test mode price IDs - should match your Stripe dashboard
    if (plan === "basic") {
      priceId = "price_1O1qfxJcECj02lzmYLgjFO4F"; // Basic plan
    } else if (plan === "standard") {
      priceId = "price_1O1qfOJcECj02lzmg6fI3s83"; // Standard plan
    } else if (plan === "premium") {
      priceId = "price_1O1qeWJcECj02lzmdUPlaT4m"; // Premium plan
    } else if (plan === "single") {
      priceId = "price_1O6OOiJcECj02lzmOu6xrG7w"; // Single job posting
      mode = "payment"; // One-time payment
    } else {
      throw new Error(`Unknown plan: ${plan}`);
    }
    
    // Determine success URL based on whether a return_url is provided
    const successUrl = return_url || `${req.headers.get("origin")}/dashboard?payment_success=true&plan=${plan}&ts=${timestamp}`;
    console.log(`Success URL set to: ${successUrl}`);

    // Create checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: mode,
        success_url: successUrl,
        cancel_url: `${req.headers.get("origin")}/pricing?payment_canceled=true`,
      });
      
      console.log("Checkout session created:", session.id, session.url);
      
      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create checkout session'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
  } catch (error) {
    console.error("Checkout function error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
