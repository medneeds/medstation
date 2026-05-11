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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 border-2 relative overflow-hidden">
          {/* Success glow */}
          {status === "success" && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10 animate-pulse"></div>
          )}
          
          <div className="relative space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-xl opacity-50"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-medical">
                  <Activity className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Processing State */}
            {status === "processing" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                <div>
                  <h2 className="text-2xl font-bold">Processando...</h2>
                  <p className="text-muted-foreground mt-2">
                    Estamos finalizando seu pagamento e criando sua conta.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {status === "success" && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="relative">
                  <PartyPopper className="w-16 h-16 mx-auto text-green-500" />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-2 -right-2"
                  >
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </motion.div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-600">Pagamento Confirmado!</h2>
                  <p className="text-muted-foreground mt-2">
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
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold">
                    {userExists ? "Bem-vindo de volta!" : "Conta Criada!"}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {userExists 
                      ? "Faça login para acessar sua assinatura." 
                      : "Entre com a senha que você criou no checkout."}
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
