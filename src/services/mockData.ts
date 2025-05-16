
import { Job, JobType, User } from "@/types";

// Mock company users
export const mockUsers: User[] = [
  {
    id: "1",
    googleId: "google123",
    email: "tech@example.com",
    companyName: "TechCorp",
    role: "company",
  },
  {
    id: "2", 
    googleId: "google456",
    email: "marketing@example.com",
    companyName: "MarketingPro",
    role: "company",
  },
];

// Calculate expiration dates (30 days from creation date)
const getExpirationDate = (creationDate: Date): Date => {
  const expiryDate = new Date(creationDate);
  expiryDate.setDate(expiryDate.getDate() + 30);
  return expiryDate;
};

// Mock job listings
export const mockJobs: Job[] = [
  {
    id: "1",
    companyId: "1",
    title: "Frontend Developer",
    description: "Vi söker en skicklig Frontend-utvecklare till vårt team. Du kommer att ansvara för att bygga användargränssnitt med React och moderna webbteknologier.",
    requirements: "Minst 3 års erfarenhet med React, goda kunskaper i JavaScript, HTML och CSS. Erfarenhet av Tailwind CSS är ett plus.",
    jobType: "fulltime" as JobType,
    educationRequired: true,
    location: "Stockholm",
    salary: "45 000 - 55 000 kr/månad",
    createdAt: new Date("2023-05-15"),
    updatedAt: new Date("2023-05-15"),
    companyName: "TechCorp",
    status: "approved",
    expiresAt: getExpirationDate(new Date("2023-05-15")),
  },
  {
    id: "2",
    companyId: "1",
    title: "Backend Developer",
    description: "Bli en del av vårt team som Backend-utvecklare för att bygga skalbara och effektiva serverapplikationer.",
    requirements: "Erfarenhet av Node.js, Express och databasdesign. Kunskap om molntjänster (AWS/Azure) krävs.",
    jobType: "fulltime" as JobType,
    educationRequired: true,
    location: "Stockholm",
    salary: "50 000 - 60 000 kr/månad",
    createdAt: new Date("2023-05-20"),
    updatedAt: new Date("2023-05-20"),
    companyName: "TechCorp",
    status: "approved",
    expiresAt: getExpirationDate(new Date("2023-05-20")),
  },
  {
    id: "3",
    companyId: "2",
    title: "Marketing Coordinator",
    description: "Hjälp till att koordinera marknadsföringskampanjer och analysera deras resultat över olika kanaler.",
    requirements: "Kandidatexamen i marknadsföring eller liknande område. Erfarenhet av digitala marknadsföringsverktyg och analyser.",
    jobType: "parttime" as JobType,
    educationRequired: true,
    location: "Göteborg",
    salary: "30 000 kr/månad",
    createdAt: new Date("2023-05-25"),
    updatedAt: new Date("2023-05-25"),
    companyName: "MarketingPro",
    status: "approved",
    expiresAt: getExpirationDate(new Date("2023-05-25")),
  },
  {
    id: "4",
    companyId: "1",
    title: "UI/UX Design Intern",
    description: "Lär dig och utvecklas som UI/UX-designer i en snabb teknisk miljö.",
    requirements: "Grundläggande kunskap om designprinciper och verktyg som Figma eller Adobe XD. Ingen formell erfarenhet krävs.",
    jobType: "internship" as JobType,
    educationRequired: false,
    location: "Distansarbete",
    createdAt: new Date("2023-06-01"),
    updatedAt: new Date("2023-06-01"),
    companyName: "TechCorp",
    status: "approved",
    expiresAt: getExpirationDate(new Date("2023-06-01")),
  },
  {
    id: "5",
    companyId: "2",
    title: "Content Writer",
    description: "Skapa engagerande innehåll för vår webbplats, blogg och sociala medieplattformar.",
    requirements: "Utmärkta skrivförmågor på svenska och engelska. Erfarenhet av att skapa innehåll för digital marknadsföring.",
    jobType: "freelance" as JobType,
    educationRequired: false,
    location: "Distansarbete",
    salary: "300 kr/timme",
    createdAt: new Date("2023-06-05"),
    updatedAt: new Date("2023-06-05"),
    companyName: "MarketingPro",
    status: "approved",
    expiresAt: getExpirationDate(new Date("2023-06-05")),
  },
];
