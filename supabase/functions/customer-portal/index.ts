
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get session auth data
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Supabase client
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.7.1");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the user token
    const token = authorization.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token", details: userError }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // Get the return_url from the request body or use the default
    // Add timestamp to prevent caching and ensure subscription_updated is recognized
    const baseReturnUrl = body?.return_url || `${req.headers.get("origin") || "http://localhost:3000"}/dashboard`;
    const timestamp = Date.now();
    
    // CRITICAL FIX: Make sure the return URL has the subscription_updated=true parameter
    // along with a timestamp to ensure the app knows to refresh the subscription data
    const hasQueryParams = baseReturnUrl.includes('?');
    let return_url = baseReturnUrl;
    
    // Clean up any existing subscription_updated params first to avoid duplicates
    if (return_url.includes('subscription_updated=')) {
      return_url = return_url.replace(/([?&])subscription_updated=true(&|$)/, '$1');
      return_url = return_url.replace(/([?&])ts=\d+(&|$)/, '$1');
      // Clean up any trailing & or ? after removal
      return_url = return_url.replace(/[?&]$/, '');
    }
    
    // Now add the fresh parameters
    return_url = return_url + (hasQueryParams ? '&' : '?') + 
      `subscription_updated=true&ts=${timestamp}`;
    
    console.log(`Return URL set to: ${return_url}`);

    // Retrieve the subscriber record
    const { data: subscriberData, error: subscriberError } = await supabase
      .from("subscribers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (subscriberError && subscriberError.code !== "PGRST116") {
      return new Response(JSON.stringify({ error: "Error fetching subscriber data", details: subscriberError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // If there's no subscriber record or no customer ID, try to find it in Stripe
    let customerId = subscriberData?.stripe_customer_id;
    if (!customerId) {
      console.log("No customer ID in database, searching in Stripe by email");
      const customers = await stripe.customers.list({ 
        email: user.email,
        limit: 1 
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`Found customer in Stripe: ${customerId}`);
        
        // Update the subscriber record with the customer ID if it exists
        if (subscriberData) {
          await supabase
            .from("subscribers")
            .update({ stripe_customer_id: customerId })
            .eq("user_id", user.id);
        } else {
          // Create a new subscriber record if it doesn't exist
          await supabase
            .from("subscribers")
            .insert({
              user_id: user.id,
              email: user.email,
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString()
            });
        }
      } else {
        return new Response(JSON.stringify({ error: "No subscription found for this user" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create a Stripe customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: return_url,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to create portal session", 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
