import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  FlaskConical,
  Pill,
  FileText,
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  Crown,
  TestTube,
  Folder,
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

interface Stats {
  totalPatients: number;
  totalCases: number;
  totalPrescriptions: number;
  totalExamRequests: number;
}

const practiceModules = [
  {
    title: "Pacientes",
    description: "Gerencie seus pacientes e históricos clínicos",
    icon: Users,
    url: "/patients",
    color: "text-primary",
    isPremium: false,
  },
  {
    title: "Casos Clínicos",
    description: "Acompanhamento e evolução de casos",
    icon: Folder,
    url: "/cases",
    color: "text-secondary",
    isPremium: false,
  },
  {
    title: "Prescrições",
    description: "Prescrições médicas digitais e assinadas",
    icon: Pill,
    url: "/prescricoes",
    color: "text-accent",
    isPremium: false,
  },
  {
    title: "Solicitação de Exames",
    description: "Solicite e gerencie exames médicos",
    icon: TestTube,
    url: "/exames",
    color: "text-warning",
    isPremium: false,
  },
];

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
  const navigate = useNavigate();
  const { subscribed } = useSubscription();
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalCases: 0,
    totalPrescriptions: 0,
    totalExamRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redireciona apenas no primeiro acesso para o tour de 3 telas
    if (!hasSeenWelcomeTour()) {
      navigate("/welcome-tour", { replace: true });
      return;
    }
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [patientsRes, casesRes, prescriptionsRes, examsRes] = await Promise.all([
        supabase
          .from("patients")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("archived", false),
        supabase
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "active"),
        supabase
          .from("prescriptions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("exam_requests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      setStats({
        totalPatients: patientsRes.count || 0,
        totalCases: casesRes.count || 0,
        totalPrescriptions: prescriptionsRes.count || 0,
        totalExamRequests: examsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    {
      label: "Pacientes Ativos",
      value: loading ? "..." : stats.totalPatients.toString(),
      icon: Users,
      trend: "Total cadastrados"
    },
    {
      label: "Casos em Andamento",
      value: loading ? "..." : stats.totalCases.toString(),
      icon: FileText,
      trend: "Casos ativos"
    },
    {
      label: "Prescrições",
      value: loading ? "..." : stats.totalPrescriptions.toString(),
      icon: Pill,
      trend: "Total emitidas"
    },
    {
      label: "Exames Solicitados",
      value: loading ? "..." : stats.totalExamRequests.toString(),
      icon: TestTube,
      trend: "Total solicitados"
    },
  ];

  return (
    <>
      <BrandIntro />
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="rounded-xl border border-primary/20 p-5 md:p-9 text-primary-foreground shadow-elevated relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/75 dark:from-primary dark:via-primary/90 dark:to-primary/60">
        {/* Soft radial highlights */}
        <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-primary-foreground/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary-foreground/10 blur-3xl pointer-events-none" />
        {/* Diagonal sheen */}
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,hsl(var(--primary-foreground)/0.07)_45%,transparent_65%)] pointer-events-none" />
        {/* Varredura de luz cinematográfica */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden">
          <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,hsl(var(--primary-foreground)/0.22),transparent)] blur-md animate-brand-sweep" />
        </div>
        <div className="relative animate-fade-in">
          <span className="font-mono text-2xs uppercase tracking-[0.22em] text-primary-foreground/70">
            MedStation
          </span>
          <div className="relative mt-2 mb-3 pb-4">
            <h1 className="font-display text-2xl md:text-4xl font-semibold tracking-tight">
              Boas-vindas ao MedStation
            </h1>
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-full -mt-1 block h-4 overflow-hidden font-display text-2xl md:text-4xl font-semibold leading-none tracking-tight text-primary-foreground opacity-[0.16] blur-[0.6px] [transform:scaleY(-1)] [mask-image:linear-gradient(to_top,transparent_5%,black_100%)] [-webkit-mask-image:linear-gradient(to_top,transparent_5%,black_100%)]"
            >
              Boas-vindas ao MedStation
            </span>
          </div>
          <p className="text-sm md:text-base text-primary-foreground/85 max-w-2xl leading-relaxed">
            Assistente clínico inteligente para otimizar seu fluxo de trabalho médico — produza mais, digite menos.
          </p>
        </div>

        {/* <Button variant="secondary" size="sm" className="md:size-lg" asChild>
          <Link to="/patients">
            <Users className="mr-2 h-4 w-4" />
            Ver Pacientes
          </Link>
        </Button> */}
      </div>

      {/* Descoberta orientada a 3 caminhos */}
      <MedStationDiscovery />

      <FreeExaminusSpotlight />


      {/* <div>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold">Prática Médica</h2>
        </div>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {practiceModules.map((module) => (
            <Link key={module.title} to={module.url}>
              <Card className="h-full hover:shadow-elevated hover:border-primary/50 transition-all cursor-pointer group relative">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl p-4 bg-gradient-to-br from-primary/10 to-primary/5 ${module.color}`}>
                      <module.icon className="h-8 w-8" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div> */}

      {/* Grade completa — colapsada, para usuários recorrentes */}
      <AllToolsSection>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <h2 className="text-xl md:text-2xl font-bold">Assistentes Médicos de IA</h2>
        </div>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {agentModules.map((module) => (
            <Link key={module.title} to={module.url} className="group/card focus:outline-none">
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
                  <Button variant="outline" className="w-full transition-all duration-300 group-hover/card:bg-primary group-hover/card:text-primary-foreground group-hover/card:border-primary">
                    {module.isPremium && !subscribed ? (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Ver Planos
                      </>
                    ) : (
                      "Acessar Assistente"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      </AllToolsSection>

      {/* Quick stats - HIDDEN */}
      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div> */}

      {/* Recent alerts - HIDDEN */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Alertas e Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">Paciente com exame crítico</p>
                  <p className="text-xs text-muted-foreground">João Silva - K+ 6.2 mEq/L</p>
                </div>
              </div>
              <Button size="sm" variant="outline">Ver</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Relatório aguardando assinatura</p>
                  <p className="text-xs text-muted-foreground">Maria Santos - Transferência UTI</p>
                </div>
              </div>
              <Button size="sm" variant="outline">Assinar</Button>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
    </>
  );
}
