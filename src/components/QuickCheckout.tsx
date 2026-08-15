import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, Mail, Zap, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackCheckoutStarted } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface QuickCheckoutProps {
  product?: "agents" | "pro_completo";
  billingPeriod?: "monthly" | "yearly";
  showPricing?: boolean;
  className?: string;
  /** Onde este checkout está embutido (para atribuição do funil) */
  origin?: string;
}

export function QuickCheckout({ 
  product = "agents", 
  billingPeriod = "monthly",
  showPricing = true,
  className = "",
  origin = "quick_checkout",
}: QuickCheckoutProps) {
  const isCompleto = product === "pro_completo";
  const plan = isCompleto
    ? billingPeriod === "yearly" ? "pro_completo_yearly" : "pro_completo"
    : billingPeriod === "yearly" ? "agents_yearly" : "agents_monthly";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const price = isCompleto
    ? billingPeriod === "yearly" ? 499.9 : 49.9
    : billingPeriod === "yearly" ? 299.9 : 29.9;

  const listPrice = isCompleto ? 99.9 : 59.9;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
      });
      return;
    }

    setLoading(true);
    trackCheckoutStarted({
      origin,
      product,
      plan,
      billing_period: billingPeriod,
      price_brl: price,
      auth_state: "guest",
    });
    try {
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: { email, product, billingPeriod, plan },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Erro no checkout",
        description: error.message || "Não foi possível iniciar o checkout.",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card className={`p-6 border-2 border-primary/50 bg-card/80 backdrop-blur-sm relative overflow-hidden ${className}`}>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10"></div>
      
      <form onSubmit={handleCheckout} className="relative space-y-4">
        {showPricing && (
          <div className="text-center mb-4">
            <Badge variant="secondary" className="mb-2">
              <Zap className="w-3 h-3 mr-1" />
              Checkout Rápido
            </Badge>
            <div className="flex items-baseline justify-center gap-2">
              {billingPeriod === "monthly" && (
                <span className="text-lg text-muted-foreground line-through">
                  R$ {listPrice.toFixed(2).replace(".", ",")}
                </span>
              )}
              <span className="text-3xl font-bold text-primary">
                R$ {price.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-muted-foreground">
                /{billingPeriod === "yearly" ? "ano" : "mês"}
              </span>
            </div>
            {billingPeriod === "monthly" && (
              <p className="mt-1 text-xs font-medium text-primary">
                por tempo limitado
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 pl-10 text-base"
              required
              disabled={loading}
            />
          </div>

          <Button 
            type="submit"
            className="w-full h-12 shadow-medical hover:shadow-elevated transition-all hover:scale-[1.02] text-base font-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                Assinar agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Pagamento seguro</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Cancele quando quiser</span>
          </div>
        </div>
        
        <p className="text-[10px] text-center text-muted-foreground">
          Ao continuar, você concorda com nossos termos de uso.
          <br />
          Você criará sua senha no checkout.
        </p>
      </form>
    </Card>
  );
}

// Versão inline (apenas input + botão)
interface InlineCheckoutProps {
  product?: "agents" | "pro_completo";
  billingPeriod?: "monthly" | "yearly";
  buttonText?: string;
  placeholder?: string;
  className?: string;
  /** Onde este checkout está embutido (para atribuição do funil) */
  origin?: string;
}

export function InlineCheckout({
  product = "agents",
  billingPeriod = "monthly",
  buttonText = "Assinar",
  placeholder = "seu@email.com",
  className = "",
  origin = "inline_checkout",
}: InlineCheckoutProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isCompleto = product === "pro_completo";
  const plan = isCompleto
    ? billingPeriod === "yearly" ? "pro_completo_yearly" : "pro_completo"
    : billingPeriod === "yearly" ? "agents_yearly" : "agents_monthly";

  const price = isCompleto
    ? billingPeriod === "yearly" ? 499.9 : 49.9
    : billingPeriod === "yearly" ? 299.9 : 29.9;


  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
      });
      return;
    }

    setLoading(true);
    trackCheckoutStarted({
      origin,
      product,
      plan,
      billing_period: billingPeriod,
      price_brl: price,
      auth_state: "guest",
    });
    try {
      const { data, error } = await supabase.functions.invoke("guest-checkout", {
        body: { email, product, billingPeriod, plan },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível iniciar o checkout.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCheckout} className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="email"
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 pl-10"
          required
          disabled={loading}
        />
      </div>
      <Button 
        type="submit"
        className="h-12 px-6 shadow-medical"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {buttonText}
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}
