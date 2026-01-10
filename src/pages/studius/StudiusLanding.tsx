import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Brain, 
  MessageSquare, 
  Trophy, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  GraduationCap,
  Zap,
  Target
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const features = [
  {
    icon: Brain,
    title: "Flashcards Inteligentes",
    description: "Sistema de repetição espaçada que otimiza sua memorização baseado no seu desempenho.",
  },
  {
    icon: Target,
    title: "Quizzes Personalizados",
    description: "Questões geradas por IA adaptadas ao seu nível e especialidade médica.",
  },
  {
    icon: MessageSquare,
    title: "Chat com IA Médica",
    description: "Tire dúvidas complexas com um assistente especializado em medicina.",
  },
  {
    icon: Trophy,
    title: "Gamificação",
    description: "Ganhe XP, suba de nível e compete no ranking com outros estudantes.",
  },
];

const benefits = [
  "Flashcards ilimitados com repetição espaçada",
  "Quizzes personalizados por especialidade",
  "Chat IA para tirar dúvidas médicas",
  "Sistema de gamificação com XP e conquistas",
  "Acompanhamento de progresso em tempo real",
  "Preparação para residência e concursos",
];

export default function StudiusLanding() {
  const navigate = useNavigate();
  const { hasAgents, hasStudius, loading } = useSubscription();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Determine price based on subscription status
  const price = hasAgents ? 9.90 : 29.90;
  const product = hasAgents ? "studius_addon" : "studius";
  const discount = hasAgents ? 50 : 0;

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth?redirect=/studius/landing");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { product },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar o checkout. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleFreeTrial = () => {
    navigate("/studius");
  };

  if (hasStudius) {
    navigate("/studius");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Studius</span>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {hasAgents && (
              <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
                <Zap className="h-3 w-3 mr-1" />
                Desconto de 50% para assinantes
              </Badge>
            )}
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Aprenda Medicina de Forma Inteligente
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Flashcards, quizzes e chat com IA para acelerar seu aprendizado médico. 
              Prepare-se para residência e concursos com tecnologia de ponta.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={isCheckingOut || loading}
              className="text-lg px-8 py-6"
            >
              {isCheckingOut ? (
                "Processando..."
              ) : (
                <>
                  Assinar por R$ {price.toFixed(2).replace(".", ",")}/mês
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleFreeTrial}
              className="text-lg px-8 py-6"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Testar Grátis
            </Button>
          </motion.div>

          {discount > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-4 text-sm text-green-400"
            >
              Você está economizando R$ 10,00/mês por já ser assinante!
            </motion.p>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Tudo que você precisa para estudar
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-bold">O que está incluso</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="container mx-auto px-4 py-16 pb-24">
        <Card className="max-w-lg mx-auto text-center bg-gradient-to-br from-background to-primary/5 border-primary/30">
          <CardContent className="p-8">
            {hasAgents && (
              <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
                Preço especial para você
              </Badge>
            )}
            <h2 className="text-3xl font-bold mb-2">Studius Premium</h2>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              {discount > 0 && (
                <span className="text-xl text-muted-foreground line-through">
                  R$ 29,90
                </span>
              )}
              <span className="text-5xl font-bold text-primary">
                R$ {price.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Cancele quando quiser. Sem compromisso.
            </p>
            <Button
              size="lg"
              onClick={handleCheckout}
              disabled={isCheckingOut || loading}
              className="w-full text-lg py-6"
            >
              {isCheckingOut ? "Processando..." : "Começar Agora"}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Pagamento seguro via Stripe
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Studius. Parte da plataforma MedStation AI.</p>
        </div>
      </footer>
    </div>
  );
}
