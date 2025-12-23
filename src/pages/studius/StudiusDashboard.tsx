import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  FileText, 
  Layers, 
  Brain, 
  TrendingUp,
  Sparkles,
  Target,
  Flame,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useStudiusPreferences, useStudiusStats } from "@/hooks/useStudius";
import { XPProgress } from "@/components/studius/XPProgress";
import StudiusLayout from "@/components/studius/StudiusLayout";

const features = [
  {
    id: "chat",
    title: "Chat IA Médico",
    description: "Assistente inteligente especializado em medicina",
    icon: MessageSquare,
    path: "/studius/chat",
    gradient: "from-cyan-500 to-blue-600",
    available: true,
  },
  {
    id: "articles",
    title: "Artigos & Traduções",
    description: "Traduza e analise artigos científicos",
    icon: FileText,
    path: "/studius/articles",
    gradient: "from-violet-500 to-purple-600",
    available: true,
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Crie e revise com repetição espaçada",
    icon: Layers,
    path: "/studius/flashcards",
    gradient: "from-emerald-500 to-teal-600",
    available: true,
  },
  {
    id: "quizzes",
    title: "Quizzes Adaptativos",
    description: "Testes personalizados por tema",
    icon: Brain,
    path: "/studius/quizzes",
    gradient: "from-orange-500 to-amber-600",
    available: true,
  },
];

export default function StudiusDashboard() {
  const navigate = useNavigate();
  const { preferences } = useStudiusPreferences();
  const { stats, weeklyStats, calculateStreak } = useStudiusStats();

  const streak = calculateStreak();
  const totalMessages = weeklyStats.reduce((acc, s) => acc + (s.messages_sent || 0), 0);
  const totalFlashcards = weeklyStats.reduce((acc, s) => acc + (s.flashcards_reviewed || 0), 0);
  const totalArticles = weeklyStats.reduce((acc, s) => acc + (s.articles_read || 0), 0);
  const studySessions = weeklyStats.filter((s) => s.messages_sent > 0 || s.flashcards_reviewed > 0).length;

  const quickStats = [
    { label: "Streak de estudos", value: `${streak} ${streak === 1 ? "dia" : "dias"}`, icon: Flame, color: "text-orange-500" },
    { label: "Mensagens enviadas", value: totalMessages.toString(), icon: MessageSquare, color: "text-cyan-500" },
    { label: "Flashcards revisados", value: totalFlashcards.toString(), icon: Layers, color: "text-emerald-500" },
    { label: "Artigos lidos", value: totalArticles.toString(), icon: BookOpen, color: "text-violet-500" },
  ];

  return (
    <StudiusLayout>
      <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-studius-primary via-studius-secondary to-studius-accent p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-white/80" />
            <span className="text-sm font-medium text-white/80">Studius Premium</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Bem-vindo ao Studius
          </h1>
          <p className="text-white/80 max-w-xl">
            Seu assistente de estudos médicos com IA.
            {preferences?.specialty && ` Especialização: ${preferences.specialty}.`}
          </p>
          {preferences?.goals && preferences.goals.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {preferences.goals.slice(0, 3).map((goal, index) => (
                <Badge key={index} variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Target className="h-3 w-3 mr-1" />
                  {goal}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* XP Progress */}
      <XPProgress />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-card/50 backdrop-blur-sm border-studius-border hover:border-studius-primary/30 transition-all duration-300 hover:shadow-studius">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-studius-muted ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Ferramentas de Estudo</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card 
              key={feature.id}
              className={`group cursor-pointer bg-card/50 backdrop-blur-sm border-studius-border hover:border-studius-primary/50 transition-all duration-300 hover:shadow-studius hover:-translate-y-1 ${!feature.available && "opacity-60"}`}
              onClick={() => feature.available && navigate(feature.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        {!feature.available && (
                          <Badge variant="outline" className="text-xs border-studius-border text-muted-foreground">
                            Em breve
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  </div>
                  {feature.available && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-studius-primary group-hover:translate-x-1 transition-all" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Study Progress */}
      <Card className="bg-card/50 backdrop-blur-sm border-studius-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <TrendingUp className="h-5 w-5 text-studius-primary" />
            Progresso Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Meta semanal</span>
                <span className="font-medium text-foreground">{studySessions}/5 sessões</span>
              </div>
              <Progress value={(studySessions / 5) * 100} className="h-2 bg-studius-muted" />
            </div>
            {studySessions === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Comece a usar o Studius para acompanhar seu progresso!
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Continue assim! Você está indo muito bem.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </StudiusLayout>
  );
}
