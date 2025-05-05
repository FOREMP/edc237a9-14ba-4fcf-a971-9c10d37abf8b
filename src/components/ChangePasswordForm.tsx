
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2Icon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define validation schema
const formSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress").optional(),
  password: z.string().min(6, "Lösenord måste vara minst 6 tecken"),
  confirmPassword: z.string().min(6, "Lösenord måste vara minst 6 tecken"),
}).refine(data => !data.password || !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Lösenorden matchar inte",
  path: ["confirmPassword"],
});

const ChangePasswordForm = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const { email, password, confirmPassword } = values;
    
    // If no values provided, show error
    if (!email && !password) {
      toast.error("Ange antingen ny e-postadress eller nytt lösenord");
      return;
    }
    
    try {
      // If email is changing
      if (email) {
        setIsChangingEmail(true);
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        toast.success("E-postadress ändrad! Kontrollera din e-post för att verifiera den nya adressen.");
        setIsChangingEmail(false);
      }
      
      // If password is changing
      if (password && confirmPassword && password === confirmPassword) {
        setIsChangingPassword(true);
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
        toast.success("Lösenord ändrat!");
        form.reset({ password: "", confirmPassword: "", email: email || "" });
        setIsChangingPassword(false);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(`Ett fel uppstod: ${error.message}`);
      setIsChangingPassword(false);
      setIsChangingEmail(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Ändra inställningar</CardTitle>
            <CardDescription>Uppdatera din e-postadress eller ditt lösenord</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-postadress</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="ny@epost.se" 
                      {...field}
                      disabled={isChangingEmail} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nytt lösenord</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field}
                      disabled={isChangingPassword} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bekräfta nytt lösenord</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field}
                      disabled={isChangingPassword} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button 
              type="submit"
              disabled={isChangingPassword || isChangingEmail}
            >
              {(isChangingPassword || isChangingEmail) ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {isChangingEmail ? 'Uppdaterar e-post...' : 'Uppdaterar lösenord...'}
                </>
              ) : "Spara ändringar"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

export default ChangePasswordForm;
