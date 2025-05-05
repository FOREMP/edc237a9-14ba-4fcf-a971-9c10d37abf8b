
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LoginButton = () => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate("/auth");
  };
  
  return (
    <Button 
      onClick={handleClick} 
      className="flex items-center gap-2 border border-black text-black"
      variant="outline"
    >
      <LogIn size={18} />
      Logga in / Registrera
    </Button>
  );
};

export default LoginButton;
