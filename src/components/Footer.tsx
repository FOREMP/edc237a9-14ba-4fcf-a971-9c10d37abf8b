
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-slate-100 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Skillbase UF</h3>
            <p className="text-slate-600">
              Förenklar rekrytering för företag och jobbsökande.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Snabblänkar</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-slate-600 hover:text-primary transition-colors">
                  Hem
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-slate-600 hover:text-primary transition-colors">
                  Hitta jobb
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-slate-600 hover:text-primary transition-colors">
                  Företagssida
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-slate-600 hover:text-primary transition-colors">
                  Cookies
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-slate-600 hover:text-primary transition-colors">
                  Användarvillkor
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-slate-600 hover:text-primary transition-colors">
                  Integritetspolicy
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">Kontakt</h3>
            <p className="text-slate-600">
              kontakt@skillbaseuf.se<br />
              Stockholm, Sverige
            </p>
          </div>
        </div>
        
        <div className="border-t border-slate-200 mt-8 pt-8 text-center text-slate-500 flex flex-col md:flex-row md:justify-center md:items-center gap-1 md:gap-2">
          <p>© {new Date().getFullYear()} Skillbase UF. Alla rättigheter förbehållna.</p>
          <p className="md:ml-2">Skapat av <a href="https://foremp.se" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">FOREMP</a></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
