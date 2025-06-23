
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { jobsService } from "@/services/jobs";
import { useEffect, useState } from "react";
import { Job } from "@/types";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/hooks/useAuth";
import LoginButton from "@/components/LoginButton";
import { BriefcaseIcon, Building2Icon, SearchIcon } from "lucide-react";

const Home = () => {
  const [latestJobs, setLatestJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchLatestJobs = async () => {
      setJobsLoading(true);
      try {
        const jobs = await jobsService.getAllJobs();
        // Sort by date and get the latest 3
        const sorted = [...jobs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLatestJobs(sorted.slice(0, 3));
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setJobsLoading(false);
      }
    };

    fetchLatestJobs();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/90 to-primary text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Hitta ditt nästa jobb eller din nästa medarbetare
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl mx-auto">
            Skill Base UF är plattformen som kopplar samman talangfulla kandidater med framstående företag.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-primary font-semibold hover:bg-white hover:text-primary">
              <Link to="/jobs">Hitta jobb</Link>
            </Button>
            {!isAuthenticated ? (
              <LoginButton />
            ) : (
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="bg-white text-primary font-semibold hover:bg-white hover:text-primary"
              >
                <Link to="/dashboard">Din dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-secondary/50 overflow-hidden">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Hur Skill Base UF fungerar</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Sök bland jobb</h3>
              <p className="text-muted-foreground">
                Filtrera bland jobbannonser baserat på plats, anställningstyp och utbildningskrav.
              </p>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2Icon size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">För företag</h3>
              <p className="text-muted-foreground">
                Skapa ett konto och börja publicera jobbannonser direkt för att hitta kvalificerade kandidater.
              </p>
            </div>
            
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BriefcaseIcon size={28} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Snabb rekrytering</h3>
              <p className="text-muted-foreground">
                Förenkla rekryteringsprocessen genom att få ansökningar direkt från kvalificerade kandidater.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Latest Jobs Section */}
      <section className="py-16 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl md:text-3xl font-bold">Senaste jobben</h2>
            <Button variant="outline" asChild className="bg-white text-primary border-primary font-semibold hover:bg-white hover:text-primary">
              <Link to="/jobs">Visa alla jobb</Link>
            </Button>
          </div>
          
          {jobsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestJobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-primary text-white overflow-hidden">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Se våra prisplaner</h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Vi erbjuder olika prisplaner för att passa ditt företags behov, från enstaka annonser till månadsabonnemang.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-primary font-semibold hover:bg-white hover:text-primary">
              <Link to="/pricing">Se prisplaner</Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              asChild 
              className="bg-white text-primary font-semibold hover:bg-white hover:text-primary"
            >
              <Link to="/auth">Prova gratis</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
