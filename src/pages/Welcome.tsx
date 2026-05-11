import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight, Mail, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Welcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<"processing" | "success" | "login" | "error">("processing");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [message, setMessage] = useState("");

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      processCheckout();
    } else {
      setStatus("error");
      setMessage("Sessão de pagamento não encontrada");
    }
  }, [sessionId]);

  const processCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("complete-checkout", {
        body: { sessionId },
      });

      if (error) throw error;

      if (data.success) {
        setEmail(data.email);
        setUserExists(data.userExists);
        
        if (data.userExists) {
          setStatus("login");
          setMessage("Sua conta já existe! Faça login para continuar.");
        } else {
          setStatus("success");
          setMessage("Conta criada com sucesso!");
          
          // Try auto-login with the email and stored password
          // Since we can't auto-login here, show login form
          setTimeout(() => setStatus("login"), 2000);
        }
      } else {
        throw new Error(data.error || "Erro ao processar pagamento");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      setStatus("error");
      setMessage(error.message || "Erro ao processar seu pagamento");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado!",
        description: "Bem-vindo ao MedStation AI!",
      });
      
      navigate("/onboarding");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle brand glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-accent/30 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 border border-hairline bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <div className="relative space-y-6">
            {/* Brand mark */}
            <div className="flex justify-center">
              <LogoMark className="w-14 h-14" />
            </div>

            {/* Processing State */}
            {status === "processing" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Processando</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Estamos finalizando seu pagamento e preparando sua conta.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {status === "success" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="relative inline-flex">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                  <div className="relative w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-primary" strokeWidth={1.75} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Pagamento confirmado</h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {message}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Login State */}
            {status === "login" && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="inline-flex w-12 h-12 rounded-full bg-primary/10 border border-primary/30 items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-primary" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {userExists ? "Bem-vindo de volta" : "Conta criada"}
                  </h2>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {userExists 
                      ? "Faça login para acessar sua assinatura." 
                      : "Entre com a senha que você definiu no checkout."}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{email}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12"
                      required
                      autoFocus
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Entrar e começar
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-muted-foreground">
                  Esqueceu a senha?{" "}
                  <Button 
                    variant="link" 
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate("/auth")}
                  >
                    Recuperar acesso
                  </Button>
                </p>
              </motion.div>
            )}

            {/* Error State */}
            {status === "error" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <span className="text-3xl">😕</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-destructive">Ops!</h2>
                  <p className="text-muted-foreground mt-2">{message}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => navigate("/")} variant="outline">
                    Voltar ao início
                  </Button>
                  <Button onClick={() => navigate("/auth")}>
                    Fazer login
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
