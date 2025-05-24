
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

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
    
    // Verify the user token using anon key for auth
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "");
    const token = authorization.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ 
        error: userError ? userError.message : "Invalid user token"
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User authenticated for portal access:", user.id, user.email);

    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Error parsing request body:", error);
      body = {};
    }
    
    const { return_url } = body || {};

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Check if the user already has a Stripe customer ID and verify they have an active subscription
    const { data: existingCustomer, error: customerError } = await supabase
      .from("subscribers")
      .select("stripe_customer_id, subscribed, subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError && customerError.code !== 'PGRST116') {
      console.error("Error fetching customer ID:", customerError);
    }

    if (!existingCustomer?.stripe_customer_id) {
      console.error("No Stripe customer ID found for user");
      return new Response(JSON.stringify({ 
        error: "No Stripe customer found for this user. Please purchase a plan first."
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the customer has an active subscription
    if (!existingCustomer.subscribed || existingCustomer.subscription_tier === 'free') {
      console.error("User does not have an active subscription");
      return new Response(JSON.stringify({ 
        error: "You need an active subscription to access the customer portal. Please purchase a plan first."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = existingCustomer.stripe_customer_id;
    console.log("Found customer ID:", customerId, "with subscription tier:", existingCustomer.subscription_tier);

    // Create a portal session
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: return_url || `${req.headers.get("origin")}/dashboard?subscription_updated=true&ts=${Date.now()}`,
      });

      console.log("Created portal session:", portalSession.id);

      return new Response(JSON.stringify({ url: portalSession.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to create portal session:", error);
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to create portal session'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Portal error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to create portal session",
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
