
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
      return new Response(JSON.stringify({ 
        error: "Missing authorization header. Please ensure you are logged in."
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ 
        error: `Authentication error: ${userError.message}`
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!user) {
      console.error("No user found in token");
      return new Response(JSON.stringify({ 
        error: "No user found. Please login again."
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User authenticated:", user.id, user.email);

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(JSON.stringify({ 
        error: "Failed to parse request body"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { plan, test_mode = true, return_url = null, timestamp = Date.now() } = body;
    
    if (!plan) {
      console.error("No plan specified");
      return new Response(JSON.stringify({ 
        error: "No plan specified"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    if (customerError && customerError.code !== 'PGRST116') {
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
          return new Response(JSON.stringify({ 
            error: `Failed to create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Create prices dynamically instead of using hardcoded price IDs
    let priceData;
    let mode = "subscription";

    if (plan === "basic") {
      priceData = {
        currency: "sek",
        product_data: {
          name: "Basic Plan",
          description: "Up to 5 job postings per month",
        },
        unit_amount: 35000, // 350 SEK in öre
        recurring: {
          interval: "month",
        },
      };
    } else if (plan === "standard") {
      priceData = {
        currency: "sek",
        product_data: {
          name: "Standard Plan",
          description: "Up to 15 job postings per month",
        },
        unit_amount: 75000, // 750 SEK in öre
        recurring: {
          interval: "month",
        },
      };
    } else if (plan === "premium") {
      priceData = {
        currency: "sek",
        product_data: {
          name: "Premium Plan",
          description: "Unlimited job postings per month",
        },
        unit_amount: 120000, // 1200 SEK in öre
        recurring: {
          interval: "month",
        },
      };
    } else if (plan === "single") {
      priceData = {
        currency: "sek",
        product_data: {
          name: "Single Job Posting",
          description: "One-time job posting",
        },
        unit_amount: 10000, // 100 SEK in öre
      };
      mode = "payment"; // One-time payment
    } else {
      return new Response(JSON.stringify({ 
        error: `Unknown plan: ${plan}`
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Determine success URL based on whether a return_url is provided
    const successUrl = return_url || `${req.headers.get("origin")}/dashboard?payment_success=true&plan=${plan}&ts=${timestamp}`;
    console.log(`Success URL set to: ${successUrl}`);

    // Create checkout session with dynamically created price
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price_data: priceData,
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
