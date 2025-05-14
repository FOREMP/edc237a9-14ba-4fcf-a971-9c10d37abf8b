
import Layout from "@/components/Layout";

const Cookies = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto prose">
          <h1>Användarvillkor & Cookiepolicy</h1>
          <p><em>Senast uppdaterad: 2025-05-14</em></p>
          
          <p>Välkommen till Skillbase UF! Genom att använda vår webbplats godkänner du dessa villkor. Läs dem noggrant.</p>
          
          <h2>1. Tjänstens syfte</h2>
          <p>Skillbase UF erbjuder en plattform där företag kan lägga upp jobbannonser och där användare kan skapa konto för att söka dessa jobb.</p>
          
          <h2>2. Användarkonto</h2>
          <p>För att kunna söka jobb behöver du skapa ett konto. Vid registrering samlar vi in din e-postadress och lagrar den säkert via Supabase.</p>
          <p>Du ansvarar för att din kontoinformation är korrekt och att du inte delar ditt lösenord med andra.</p>
          
          <h2>3. Dataskydd och integritet</h2>
          <p>Vi värnar om din integritet. Endast din e-postadress och inloggningsinformation sparas. Vi delar inte dina uppgifter med tredje part utan ditt samtycke, förutom om lagen kräver det.</p>
          <p>Mer information hittar du i vår Integritetspolicy.</p>
          
          <h2>4. Användarens ansvar</h2>
          <p>Du får inte:</p>
          <ul>
            <li>Skapa falska konton</li>
            <li>Ladda upp olagligt eller olämpligt innehåll</li>
            <li>Missbruka plattformen på något sätt</li>
          </ul>
          <p>Vi förbehåller oss rätten att stänga av användare som bryter mot dessa villkor.</p>
          
          <h2>5. Företagsannonser</h2>
          <p>Företag som publicerar jobb ansvarar själva för innehållet i annonserna. Skillbase UF tar inget ansvar för felaktigheter eller vilseledande information i dessa.</p>
          
          <h2>6. Ansvarsbegränsning</h2>
          <p>Skillbase UF ansvarar inte för skador eller förluster som uppstår till följd av användning av webbplatsen.</p>
          
          <h2>7. Ändringar</h2>
          <p>Vi kan komma att uppdatera dessa villkor. Du informeras via webbplatsen om större ändringar.</p>
          
          <h2>🍪 Cookiepolicy – Skillbase UF</h2>
          <p><em>Senast uppdaterad: 2025-05-14</em></p>
          
          <h3>Vad är cookies?</h3>
          <p>Cookies är små textfiler som sparas på din enhet när du besöker en webbplats. De hjälper oss att förbättra funktionaliteten och användarupplevelsen.</p>
          
          <h3>Vilka cookies använder vi?</h3>
          <table className="w-full border-collapse my-4">
            <thead>
              <tr>
                <th className="border p-2 text-left">Cookie Typ</th>
                <th className="border p-2 text-left">Syfte</th>
                <th className="border p-2 text-left">Sparad data</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">Nödvändiga cookies</td>
                <td className="border p-2">För att du ska kunna logga in och använda tjänsten</td>
                <td className="border p-2">Inloggningsstatus (via Supabase)</td>
              </tr>
              <tr>
                <td className="border p-2">Funktionella cookies</td>
                <td className="border p-2">För att komma ihåg vissa inställningar</td>
                <td className="border p-2">Språkval, sessionsinformation</td>
              </tr>
            </tbody>
          </table>
          
          <p>Vi använder inga cookies i marknadsföringssyfte och samlar inte in spårningsdata.</p>
          
          <h3>Hur kan du kontrollera cookies?</h3>
          <p>Du kan välja att blockera eller radera cookies i din webbläsare. Tänk på att webbplatsens funktionalitet kan påverkas om du blockerar nödvändiga cookies.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Cookies;
