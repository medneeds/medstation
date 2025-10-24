import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { Link } from "react-router-dom";

const quickStats = [
  { label: "Pacientes Ativos", value: "42", icon: Users, trend: "+3 esta semana" },
  { label: "Relatórios Pendentes", value: "8", icon: FileText, trend: "4 urgentes" },
  { label: "Exames Recebidos", value: "15", icon: FlaskConical, trend: "Hoje" },
  { label: "Prescrições", value: "23", icon: Pill, trend: "Este mês" },
];

const modules = [
  {
    title: "Clínicus",
    description: "Relatórios de transferência e evolução clínica",
    icon: Stethoscope,
    url: "/clinicus",
    color: "text-primary",
  },
  {
    title: "Examinus",
    description: "Gestão e análise de exames laboratoriais",
    icon: FlaskConical,
    url: "/examinus",
    color: "text-secondary",
  },
  {
    title: "Scorius/Numerus",
    description: "Cálculos clínicos e scores prognósticos",
    icon: Calculator,
    url: "/scorius",
    color: "text-warning",
  },
  {
    title: "Prescriptus",
    description: "Prescrições estruturadas e validadas",
    icon: Pill,
    url: "/prescriptus",
    color: "text-destructive",
  },
  {
    title: "CODexus",
    description: "Busca e codificação CID-10 e LOINC",
    icon: FileText,
    url: "/codexus",
    color: "text-primary",
  },
];

export default function Dashboard() {
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

      {/* AI Agents - Main Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Agentes Médicos de IA</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.title} to={module.url}>
              <Card className="h-full hover:shadow-elevated hover:border-primary/50 transition-all cursor-pointer group">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl p-4 bg-gradient-to-br from-primary/10 to-primary/5 ${module.color}`}>
                      <module.icon className="h-8 w-8" />
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
                    Acessar Agente
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
