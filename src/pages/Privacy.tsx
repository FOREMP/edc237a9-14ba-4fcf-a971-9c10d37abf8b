
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto prose">
          <h1>Integritetspolicy</h1>
          <p><em>Senast uppdaterad: 14 maj 2025</em></p>
          
          <p>Din integritet är viktig för oss. Här förklarar vi hur vi hanterar dina personuppgifter när du använder vår plattform.</p>
          
          <h2>1. Vem är ansvarig för dina uppgifter?</h2>
          <p>Skillbase UF är personuppgiftsansvarig för behandlingen av dina personuppgifter. Vi följer Dataskyddsförordningen (GDPR).</p>
          
          <h2>2. Vilka uppgifter vi samlar in</h2>
          <p>När du registrerar dig som användare samlar vi in följande:</p>
          <ul>
            <li>Din e-postadress</li>
            <li>Din inloggningsinformation (t.ex. lösenordshash)</li>
          </ul>
          <p>All information lagras säkert i Supabase.</p>
          
          <h2>3. Varför vi samlar in uppgifterna</h2>
          <p>Vi använder dina uppgifter för att:</p>
          <ul>
            <li>Skapa och hantera ditt konto</li>
            <li>Möjliggöra att du kan söka jobb via plattformen</li>
            <li>Kommunicera med dig vid behov (t.ex. lösenordsåterställning)</li>
          </ul>
          <p>Vi använder inte dina uppgifter för marknadsföring eller vidareförsäljning.</p>
          
          <h2>4. Hur länge vi sparar dina uppgifter</h2>
          <p>Vi sparar dina uppgifter så länge du har ett aktivt konto. Du kan när som helst kontakta oss för att radera ditt konto och dina uppgifter.</p>
          
          <h2>5. Dina rättigheter</h2>
          <p>Du har rätt att:</p>
          <ul>
            <li>Begära ett utdrag på vilka uppgifter vi har om dig</li>
            <li>Få dina uppgifter rättade eller raderade</li>
            <li>Återkalla ditt samtycke</li>
          </ul>
          <p>Kontakta oss på kontakt@skillbaseuf.se om du vill utöva någon av dessa rättigheter.</p>
          
          <h2>6. Cookies</h2>
          <p>Vi använder endast nödvändiga cookies för att du ska kunna logga in och använda plattformen. Mer information finns i vår <Link to="/cookies" className="text-primary hover:underline">Cookiepolicy</Link>.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Privacy;
