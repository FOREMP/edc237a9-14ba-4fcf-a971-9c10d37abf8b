
import Layout from "@/components/Layout";

const Terms = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto prose">
          <h1>Användarvillkor</h1>
          <p><em>Senast uppdaterad: 14 maj 2025</em></p>
          
          <p>Välkommen till Skillbase UF! Genom att använda vår webbplats godkänner du dessa villkor. Läs igenom dem noggrant.</p>
          
          <h2>1. Om tjänsten</h2>
          <p>Skillbase UF är en digital plattform där företag kan publicera jobbannonser och där studenter och arbetssökande kan registrera sig för att söka jobb.</p>
          
          <h2>2. Kontoregistrering</h2>
          <p>För att kunna söka jobb behöver du skapa ett konto. Vid registrering sparar vi din e-postadress och din inloggningsinformation via Supabase. Du ansvarar själv för att hålla dina uppgifter korrekta och säkra.</p>
          
          <h2>3. Ansvarsbegränsning</h2>
          <p>Skillbase UF erbjuder endast plattformen för jobbannonser och ansökningar. Vi ansvarar inte för innehållet i jobbannonserna, rekryteringsprocesser eller eventuella avtal mellan företag och arbetssökande.</p>
          
          <h2>4. Användarens ansvar</h2>
          <p>Du godkänner att inte:</p>
          <ul>
            <li>Skapa falska eller vilseledande konton</li>
            <li>Missbruka eller försöka påverka plattformens funktionalitet</li>
            <li>Använda tjänsten för olaglig verksamhet</li>
          </ul>
          <p>Om du bryter mot dessa regler kan ditt konto stängas av utan förvarning.</p>
          
          <h2>5. Ändringar</h2>
          <p>Vi förbehåller oss rätten att uppdatera dessa villkor. Vid större ändringar informerar vi dig via hemsidan.</p>
          
          <p>För frågor är du välkommen att kontakta oss på:<br />
          kontakt@skillbaseuf.se</p>
        </div>
      </div>
    </Layout>
  );
};

export default Terms;
