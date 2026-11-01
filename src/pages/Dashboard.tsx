import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  FlaskConical,
  Pill,
  FileText,
  Activity,
  Crown,
  Wind,
  FileCheck,
  BookOpen,
  Compass,
  Sigma,
  MessagesSquare,
  Scale,

} from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { MedStationDiscovery, AllToolsSection } from "@/components/MedStationDiscovery";
import { FreeExaminusSpotlight } from "@/components/FreeExaminusSpotlight";
import { AnnualBonusCard } from "@/components/AnnualBonusCard";
import { VaultSpotlight } from "@/components/VaultSpotlight";

const agentModules = [
  {
    title: "Clínicus",
    description: "Sua anamnese pronta",
    icon: Stethoscope,
    url: "/clinicus",
    color: "text-primary",
    isPremium: true,
  },
  {
    title: "Examinus",
    description: "Resuma exames em segundos",
    icon: FlaskConical,
    url: "/examinus",
    color: "text-examinus",
    isPremium: true,
  },
  {
    title: "Scorius",
    description: "Calcule scores e risco em segundos",
    icon: Activity,
    url: "/scorius",
    color: "text-warning",
    isPremium: true,
  },
  {
    title: "Numerus",
    description: "Calculadoras médicas instantâneas",
    icon: Sigma,
    url: "/numerus",
    color: "text-green-500",
    isPremium: true,
  },
  {
    title: "Prescriptus",
    description: "Bula inteligente e consulta de medicamentos",
    icon: Pill,
    url: "/prescriptus",
    color: "text-destructive",
    isPremium: true,
  },
  {
    title: "CODexus",
    description: "Encontre o CID-10 certo na hora",
    icon: FileText,
    url: "/codexus",
    color: "text-primary",
    isPremium: true,
  },
  {
    title: "Gasometrus",
    description: "Leia gasometria na hora",
    icon: Wind,
    url: "/gasometrus",
    color: "text-cyan-500",
    isPremium: true,
  },
  {
    title: "Atestus",
    description: "Atestados prontos em um clique",
    icon: FileCheck,
    url: "/atestus",
    color: "text-emerald-500",
    isPremium: true,
  },
  {
    title: "Protocolus",
    description: "Protocolos atualizados na hora",
    icon: BookOpen,
    url: "/protocolus",
    color: "text-amber-500",
    isPremium: true,
  },
  {
    title: "Orientus",
    description: "Orientações claras para o paciente",
    icon: Compass,
    url: "/orientus",
    color: "text-orange-500",
    isPremium: true,
  },
  {
    title: "Mediscuss",
    description: "Pareceres, discussões e regulação prontos",
    icon: MessagesSquare,
    url: "/mediscuss",
    color: "text-primary",
    isPremium: true,
  },
  {
    title: "Legalis",
    description: "Proteção jurídica e dúvidas éticas (CFM)",
    icon: Scale,
    url: "/legalis",
    color: "text-amber-600",
    isPremium: true,
  },
];


export default function Dashboard() {
  const { subscribed, isAnnual } = useSubscription();
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  // Só o e-mail da conta (cartão do bônus anual); sem contagens que nada exibe.
  useEffect(() => {
    let active = true;
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (active) setAccountEmail(user?.email ?? null);
      })
      .catch((error) => console.error("Error fetching user:", error));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <VaultSpotlight />

      {/* Descoberta orientada a 3 caminhos — dominante */}
      <MedStationDiscovery />

      <FreeExaminusSpotlight />

      {isAnnual && <AnnualBonusCard variant="member" accountEmail={accountEmail} />}

      {/* Grade completa — colapsada, para usuários recorrentes */}
      <AllToolsSection>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold">Todas as ferramentas</h2>
        </div>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {agentModules.map((module) => (
            <Link key={module.title} to={module.url} className="group/card rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full cursor-pointer relative overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 ease-out hover:border-primary/40 hover:shadow-elevated hover:-translate-y-0.5">
                {/* Soft hover glow */}
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.08),transparent_60%)]" />
                {/* Top accent line */}
                <div className="pointer-events-none absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                <CardHeader className="space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl p-3.5 bg-primary/8 text-primary border border-primary/15 transition-all duration-300 ease-out group-hover/card:bg-primary group-hover/card:text-primary-foreground group-hover/card:border-primary group-hover/card:scale-[1.04] group-hover/card:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.6)]">
                      <module.icon className="h-7 w-7 transition-transform duration-300 ease-out" strokeWidth={1.75} />
                    </div>
                    {module.isPremium && !subscribed && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        <Crown className="w-3 h-3 mr-1" />
                        Pro
                      </Badge>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2 transition-colors duration-300 group-hover/card:text-primary">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  {/* Visual de botão dentro do link (botão real dentro de <a> é aninhamento inválido). */}
                  <span
                    className={buttonVariants({
                      variant: "outline",
                      className:
                        "w-full transition-all duration-300 group-hover/card:bg-primary group-hover/card:text-primary-foreground group-hover/card:border-primary",
                    })}
                  >
                    {module.isPremium && !subscribed ? (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Ver Planos
                      </>
                    ) : (
                      "Acessar Assistente"
                    )}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      </AllToolsSection>
    </div>
  );
}
