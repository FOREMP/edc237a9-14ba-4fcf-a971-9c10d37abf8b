
import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star, CircleCheck, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStripePayment } from "@/hooks/useStripePayment";
import { useSearchParams } from 'react-router-dom';
import { toast } from "sonner";
import { useSubscriptionFeatures } from "@/hooks/useSubscriptionFeatures";

const PricingPage = () => {
  const { isAuthenticated } = useAuth();
  const { handlePayment, isLoading } = useStripePayment();
  const [searchParams] = useSearchParams();
  const [showTestCardInfo, setShowTestCardInfo] = useState(false);
  const { refreshSubscription } = useSubscriptionFeatures();
  
  const calculateDailyPrice = (monthlyPrice: number) => {
    return (monthlyPrice / 30).toFixed(2);
  };
  
  useEffect(() => {
    // Check if user has returned from payment flow
    if (searchParams.get('payment_success') === 'true') {
      // Toast will be handled by useSubscriptionStatus hook
      refreshSubscription();
    }
    
    // Handle payment cancellation
    if (searchParams.get('payment_cancelled') === 'true') {
      toast.info('Betalningen avbröts');
    }
    
    // Handle return from customer portal
    if (searchParams.get('portal_return') === 'true') {
      toast.info('Prenumerationsinformation uppdaterad');
      refreshSubscription();
      
      // Remove parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, refreshSubscription]);

  const handleButtonClick = (plan: 'basic' | 'standard' | 'premium' | 'single') => {
    setShowTestCardInfo(true);
    handlePayment(plan);
  };

  return (
    <Layout>
      <section className="py-20 bg-gradient-to-b from-skillbase-light to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Prenumerationspaket för Företag</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Välj det paket som passar ditt företag bäst.
            </p>
          </div>

          {showTestCardInfo && (
            <div className="mb-8 p-4 border border-amber-300 bg-amber-50 rounded-md flex items-start gap-3 max-w-2xl mx-auto">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">För test av betalning:</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Lyckat köp: <strong>4242 4242 4242 4242</strong></li>
                  <li>• Avvisat kort: <strong>4000 0000 0000 0002</strong></li>
                  <li className="mt-2 text-xs text-muted-foreground">Du kan använda valfria värden för utgångsdatum, CVC och ZIP-kod.</li>
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Bas Package */}
            <div className="pricing-card">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Bas</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold">350 kr</span>
                  <span className="text-muted-foreground ml-2">/månad</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {calculateDailyPrice(350)} kr per dag
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Upp till 5 annonser per månad</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Grundläggande synlighet</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Annonser aktiva i 30 dagar</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleButtonClick('basic')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bearbetar...
                  </>
                ) : "Välj paket"}
              </Button>
            </div>

            {/* Standard Package - Popular */}
            <div className="pricing-card pricing-card-popular">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-skillbase-primary">
                Mest populär
              </Badge>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Standard</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold">750 kr</span>
                  <span className="text-muted-foreground ml-2">/månad</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {calculateDailyPrice(750)} kr per dag
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                  <CircleCheck className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Upp till 15 annonser per månad</span>
                </li>
                <li className="flex items-start">
                  <CircleCheck className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Grundläggande synlighet</span>
                </li>
                <li className="flex items-start">
                  <CircleCheck className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Visningsstatistik</span>
                </li>
                <li className="flex items-start">
                  <CircleCheck className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Annonser aktiva i 30 dagar</span>
                </li>
              </ul>

              <Button 
                className="w-full"
                onClick={() => handleButtonClick('standard')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bearbetar...
                  </>
                ) : "Välj paket"}
              </Button>
            </div>

            {/* Premium Package */}
            <div className="pricing-card">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold">1 200 kr</span>
                  <span className="text-muted-foreground ml-2">/månad</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {calculateDailyPrice(1200)} kr per dag
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Obegränsat antal annonser</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Prioriterad support</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Avancerad statistik och rapportering</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Möjlighet att "boosta" annonser</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                  <span>Annonser aktiva i 30 dagar</span>
                </li>
              </ul>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleButtonClick('premium')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bearbetar...
                  </>
                ) : "Välj paket"}
              </Button>
            </div>
          </div>

          {/* Individual Ad Purchase */}
          <div className="mt-20 max-w-2xl mx-auto bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Köp enstaka annons</h2>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <p className="text-xl mb-2">
                  <span className="font-bold">100 kr</span>
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                    <span>Aktiv i 30 dagar</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                    <span>Ingen prenumeration krävs</span>
                  </li>
                </ul>
              </div>
              
              <Button 
                size="lg"
                onClick={() => handleButtonClick('single')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bearbetar...
                  </>
                ) : "Köp annons"}
              </Button>
            </div>
          </div>

          {/* Free Trial */}
          <div className="mt-16 text-center max-w-3xl mx-auto bg-skillbase-light p-8 rounded-lg">
            <div className="flex flex-col items-center">
              <Star className="h-12 w-12 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-4">Prova gratis först!</h2>
              <p className="text-lg mb-6">
                Skapa en gratis testannons som är aktiv i 30 dagar. Därefter kan du välja om du vill fortsätta med ett abonnemang eller köpa enstaka annonser.
              </p>
              <Button 
                size="lg" 
                className="bg-skillbase-primary hover:bg-skillbase-dark"
                asChild
              >
                <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                  Prova gratis
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PricingPage;
