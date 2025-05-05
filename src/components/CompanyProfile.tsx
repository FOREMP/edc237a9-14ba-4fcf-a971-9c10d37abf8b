
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Form validation schema
const formSchema = z.object({
  companyName: z.string().min(2, "Företagsnamn måste vara minst 2 tecken"),
  companyDescription: z.string().min(10, "Företagsbeskrivning måste vara minst 10 tecken"),
  organizationNumber: z.string().min(10, "Organisationsnummer måste vara minst 10 tecken"),
  vatNumber: z.string().optional(),
  website: z.string().url("Ogiltig webbadress").optional().or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

const CompanyProfile = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      companyDescription: "",
      organizationNumber: "",
      vatNumber: "",
      website: "",
    },
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setAuthError("Du är inte inloggad. Logga in för att spara företagsinformation.");
      } else {
        setAuthError(null);
      }
    };
    
    checkAuth();
  }, []);

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user && !isLoading) {
      form.reset({
        companyName: user.companyName || "",
        companyDescription: user.companyDescription || "",
        organizationNumber: user.organizationNumber || "",
        vatNumber: user.vatNumber || "",
        website: user.website || "",
      });
    }
  }, [user, isLoading, form]);

  const onSubmit = async (values: FormData) => {
    if (authError) {
      toast.error(authError);
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Check if the session is valid
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Din session har gått ut. Logga in igen för att spara ändringar.");
        setIsSubmitting(false);
        return;
      }
      
      const { success, error } = await authService.updateProfile({
        companyName: values.companyName,
        companyDescription: values.companyDescription,
        organizationNumber: values.organizationNumber,
        vatNumber: values.vatNumber || undefined,
        website: values.website || undefined,
      });

      if (success) {
        toast.success("Företagsinformation har sparats");
      } else {
        toast.error(`Kunde inte spara: ${error}`);
      }
    } catch (error) {
      toast.error("Ett fel uppstod vid sparande");
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Företagsinformation</h2>
      
      {authError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
          {authError}
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Företagsnamn *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="companyDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Om företaget *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    rows={5}
                    placeholder="Beskriv ert företag, verksamhet och kultur..."
                  />
                </FormControl>
                <FormDescription>
                  Minst 10 tecken. Denna information kan visas för personer som söker era jobb.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="organizationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organisationsnummer *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="XXXXXX-XXXX"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="vatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Momsregistreringsnummer</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="SE XXXXXXXXXX"
                  />
                </FormControl>
                <FormDescription>
                  Valfritt. Ange ert momsregistreringsnummer om tillämpligt.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hemsida</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="https://www.example.com"
                  />
                </FormControl>
                <FormDescription>
                  Valfritt. Ange hela URL:en inklusive https://
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || !!authError}
              className="w-full md:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                "Spara information"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CompanyProfile;
