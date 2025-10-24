import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  FlaskConical,
  Calculator,
  Pill,
  FileText,
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  Crown,
  TestTube,
  Folder,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";

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
    description: "Relatórios de transferência e evolução clínica",
    icon: Stethoscope,
    url: "/clinicus",
    color: "text-primary",
    isPremium: true,
  },
  {
    title: "Examinus",
    description: "Gestão e análise de exames laboratoriais",
    icon: FlaskConical,
    url: "/examinus",
    color: "text-secondary",
    isPremium: false,
  },
  {
    title: "Scorius",
    description: "Scores prognósticos e escalas clínicas",
    icon: Activity,
    url: "/scorius",
    color: "text-warning",
    isPremium: true,
  },
  {
    title: "Numerus",
    description: "Cálculos clínicos e conversões de unidades",
    icon: Calculator,
    url: "/numerus",
    color: "text-accent",
    isPremium: true,
  },
  {
    title: "Prescriptus",
    description: "Prescrições estruturadas e validadas",
    icon: Pill,
    url: "/prescriptus",
    color: "text-destructive",
    isPremium: true,
  },
  {
    title: "CODexus",
    description: "Busca e codificação CID-10 e LOINC",
    icon: FileText,
    url: "/codexus",
    color: "text-primary",
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
    fetchStats();
  }, []);

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
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="rounded-lg bg-gradient-hero p-8 text-white shadow-elevated">
        <h1 className="text-3xl font-bold mb-2">Bem-vindo ao MedStation AI</h1>
        <p className="text-white/90 mb-4">
          Assistente clínico inteligente para otimizar seu fluxo de trabalho médico
        </p>
        <Button variant="secondary" size="lg" asChild>
          <Link to="/patients">
            <Users className="mr-2 h-4 w-4" />
            Ver Pacientes
          </Link>
        </Button>
      </div>

      {/* Prática Médica Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Prática Médica</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* AI Agents - Main Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Agentes Médicos de IA</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agentModules.map((module) => (
            <Link key={module.title} to={module.url}>
              <Card className="h-full hover:shadow-elevated hover:border-primary/50 transition-all cursor-pointer group relative">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl p-4 bg-gradient-to-br from-primary/10 to-primary/5 ${module.color}`}>
                      <module.icon className="h-8 w-8" />
                    </div>
                    {module.isPremium && !subscribed && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        <Crown className="w-3 h-3 mr-1" />
                        Pro
                      </Badge>
                    )}
                    {!module.isPremium && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                        Grátis
                      </Badge>
                    )}
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
                    {module.isPremium && !subscribed ? (
                      <>
                        <Crown className="mr-2 h-4 w-4" />
                        Ver Planos
                      </>
                    ) : (
                      "Acessar Agente"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Recent alerts */}
      <Card>
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
      </Card>
    </div>
  );
}
