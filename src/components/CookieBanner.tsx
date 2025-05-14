
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already accepted cookies
    const hasCookieConsent = localStorage.getItem("cookie-consent");
    if (!hasCookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-consent", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Godkänn Cookies</h3>
          <p className="text-muted-foreground">
            Genom att godkänna Cookies godkänner du våra{" "}
            <Link to="/cookies" className="text-primary hover:underline">
              villkor
            </Link>
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={acceptCookies} variant="default">
            Godkänn
          </Button>
          <Button 
            onClick={() => setIsVisible(false)} 
            variant="outline"
            size="icon"
          >
            <X size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
