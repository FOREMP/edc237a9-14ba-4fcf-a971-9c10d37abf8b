
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-slate-100 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Skillbase UF</h3>
            <p className="text-muted-foreground">
              Förenklar rekrytering för företag och jobbsökande.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Snabblänkar</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary">
                  Hem
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-muted-foreground hover:text-primary">
                  Hitta jobb
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary">
                  Företagssida
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-primary">
                  Användarvillkor & Cookies
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Kontakt</h3>
            <p className="text-muted-foreground">
              kontakt@skillbaseuf.se<br />
              Stockholm, Sverige
            </p>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground flex justify-center items-center">
          <p>© {new Date().getFullYear()} Skillbase UF. Alla rättigheter förbehållna.</p>
          <p className="ml-2">Skapat av <a href="https://foremp.se" target="_blank" rel="noopener noreferrer" className="hover:text-primary">FOREMP</a></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
