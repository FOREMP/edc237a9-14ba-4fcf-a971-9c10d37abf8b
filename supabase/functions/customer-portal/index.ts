
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get Stripe key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: Missing Stripe key");
      throw new Error("STRIPE_SECRET_KEY är inte inställd");
    }
    logStep("Retrieved Stripe key", { keyLength: stripeKey.length });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: Missing Authorization header");
      throw new Error("Auktoriseringsheader saknas");
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length });
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error", { error: userError.message });
      throw new Error(`Autentiseringsfel: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: No authenticated user or missing email");
      throw new Error("Användaren är inte autentiserad eller email saknas");
    }
    logStep("User authenticated", { email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if portal configuration exists, and create one if it doesn't
    const attemptCreateConfiguration = async () => {
      try {
        logStep("Creating default configuration");
        
        // First, fetch products to use in configuration
        const products = await stripe.products.list({ active: true, limit: 10 });
        logStep("Products fetched for configuration", { count: products.data.length });
        
        // Fetch prices for each product
        const productConfigs = [];
        for (const product of products.data) {
          const prices = await stripe.prices.list({ 
            product: product.id, 
            active: true,
            limit: 10 
          });
          
          const priceIds = prices.data.map(price => price.id);
          logStep(`Prices fetched for product ${product.id}`, { count: priceIds.length });
          
          if (priceIds.length > 0) {
            productConfigs.push({
              product: product.id,
              prices: priceIds
            });
          }
        }
        
        if (productConfigs.length === 0) {
          logStep("No products with prices found, skipping product configuration");
        }
        
        // Create default configuration with the products
        await stripe.billingPortal.configurations.create({
          business_profile: {
            headline: "Företagsprofil",
            privacy_policy_url: "https://example.com/privacy",
            terms_of_service_url: "https://example.com/terms",
          },
          features: {
            customer_update: {
              enabled: true,
              allowed_updates: ["email", "name"],
            },
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { 
              enabled: true,
              mode: "immediately",
              proration_behavior: "none",
            },
            subscription_update: {
              enabled: true,
              default_allowed_updates: ["price"],
              products: productConfigs.length > 0 ? productConfigs : undefined,
              proration_behavior: "none",
            },
          },
        });
        
        logStep("Default configuration created successfully");
        return true;
      } catch (configError: any) {
        logStep("Error creating default configuration", { error: configError.message });
        return false;
      }
    };

    // Find the customer
    try {
      logStep("Looking up customer by email", { email: user.email });
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length === 0) {
        // Create a new customer if they don't exist yet
        logStep("No customer found, creating a new one");
        const customer = await stripe.customers.create({ 
          email: user.email,
          metadata: { user_id: user.id },
          name: user.user_metadata?.company_name || user.user_metadata?.name || "Företag"
        });
        
        logStep("Customer created", { customerId: customer.id });
        
        // Create portal session
        const origin = req.headers.get("origin") || "https://zgcsgwlggvjvvshhhcmb.supabase.co";
        logStep("Creating portal session", { origin, customerId: customer.id });
        
        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: `${origin}/dashboard`,
          });
          
          logStep("Portal session created", { url: session.url });
          
          return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (portalError: any) {
          logStep("Portal session creation error", { error: portalError.message });
          
          // If the error is about configuration, create a default one
          if (portalError.message.includes('configuration')) {
            const configSuccess = await attemptCreateConfiguration();
            if (!configSuccess) {
              throw new Error("Kunde inte skapa kundportalkonfiguration");
            }
            
            // Try again to create the session
            const session = await stripe.billingPortal.sessions.create({
              customer: customer.id,
              return_url: `${origin}/dashboard`,
            });
            
            logStep("Portal session created after configuration", { url: session.url });
            
            return new Response(JSON.stringify({ url: session.url }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
          
          throw portalError;
        }
      }
      
      const customerId = customers.data[0].id;
      logStep("Customer found", { customerId });

      // Create portal session
      const origin = req.headers.get("origin") || "https://zgcsgwlggvjvvshhhcmb.supabase.co";
      logStep("Creating portal session", { origin, customerId });
      
      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${origin}/dashboard`,
        });
        
        logStep("Portal session created", { url: session.url });
        
        return new Response(JSON.stringify({ url: session.url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (portalError: any) {
        logStep("Portal session creation error", { error: portalError.message });
        
        // If the error is about configuration, create a default one
        if (portalError.message.includes('configuration')) {
          const configSuccess = await attemptCreateConfiguration();
          if (!configSuccess) {
            throw new Error("Kunde inte skapa kundportalkonfiguration");
          }
          
          // Try again to create the session
          const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/dashboard`,
          });
          
          logStep("Portal session created after configuration", { url: session.url });
          
          return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        throw portalError;
      }
    } catch (stripeError: any) {
      // Handle Stripe errors separately
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown error';
      logStep("Stripe error", { error: errorMessage });
      
      return new Response(JSON.stringify({ 
        error: `Stripe-fel: ${errorMessage}`,
        details: stripeError instanceof Error ? stripeError.stack : 'Unknown error'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400, // Use 400 for client errors like no customer found
      });
    }
  } catch (error: any) {
    console.error("Error creating portal session:", error);
    logStep("ERROR in customer-portal", { 
      message: error.message,
      stack: error instanceof Error ? error.stack : 'Unknown error' 
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error instanceof Error ? error.stack : 'Unknown error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
