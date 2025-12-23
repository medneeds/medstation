import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StudiusLayout from '@/components/studius/StudiusLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Brain, 
  Sparkles, 
  Loader2, 
  Play, 
  Trash2,
  Trophy,
  Clock,
  Target
} from 'lucide-react';
import { useQuizzes } from '@/hooks/useQuizzes';
import { useStudiusPreferences } from '@/hooks/useStudius';
import QuizPlayer from '@/components/studius/QuizPlayer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StudiusQuizzes() {
  const queryClient = useQueryClient();
  const { 
    isGenerating, 
    fetchQuizzes, 
    fetchQuizWithQuestions, 
    generateQuiz, 
    startAttempt, 
    submitAttempt, 
    deleteQuiz 
  } = useQuizzes();
  const { preferences } = useStudiusPreferences();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState([10]);
  
  const [activeQuiz, setActiveQuiz] = useState<{
    quiz: any;
    questions: any[];
    attempt: any;
  } | null>(null);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['studius-quizzes'],
    queryFn: fetchQuizzes
  });

  const handleGenerateQuiz = async () => {
    if (!topic.trim()) return;

    const quiz = await generateQuiz(
      topic,
      difficulty,
      questionCount[0],
      preferences?.study_level,
      preferences?.specialty
    );

    if (quiz) {
      setIsCreateDialogOpen(false);
      setTopic('');
      queryClient.invalidateQueries({ queryKey: ['studius-quizzes'] });
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    const data = await fetchQuizWithQuestions(quizId);
    if (!data) return;

    const attempt = await startAttempt(quizId, data.questions.length);
    if (!attempt) return;

    setActiveQuiz({
      quiz: data.quiz,
      questions: data.questions,
      attempt
    });
  };

  const handleCompleteQuiz = async (
    answers: { questionIndex: number; selectedAnswer: number }[],
    timeSpentSeconds: number
  ) => {
    if (!activeQuiz) return;

    await submitAttempt(
      activeQuiz.attempt.id,
      answers,
      activeQuiz.questions,
      timeSpentSeconds
    );

    queryClient.invalidateQueries({ queryKey: ['studius-quizzes'] });
  };

  const handleCancelQuiz = () => {
    setActiveQuiz(null);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    await deleteQuiz(quizId);
    queryClient.invalidateQueries({ queryKey: ['studius-quizzes'] });
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted';
    }
  };

  // Se está jogando um quiz
  if (activeQuiz) {
    return (
      <StudiusLayout>
        <div className="p-6">
          <QuizPlayer
            questions={activeQuiz.questions}
            onComplete={handleCompleteQuiz}
            onCancel={handleCancelQuiz}
          />
        </div>
      </StudiusLayout>
    );
  }

  return (
    <StudiusLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-7 w-7 text-studius-primary" />
              Quizzes
            </h1>
            <p className="text-muted-foreground mt-1">
              Teste seus conhecimentos com questões geradas por IA
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-studius-primary hover:bg-studius-primary/90">
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Quiz com IA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-studius-primary" />
                  Gerar Quiz com IA
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Tema do Quiz</Label>
                  <Input
                    id="topic"
                    placeholder="Ex: Fisiologia cardiovascular, Farmacologia..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dificuldade</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Fácil</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="hard">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Número de questões</Label>
                    <span className="text-sm font-medium text-studius-primary">
                      {questionCount[0]}
                    </span>
                  </div>
                  <Slider
                    value={questionCount}
                    onValueChange={setQuestionCount}
                    min={5}
                    max={20}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5</span>
                    <span>20</span>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateQuiz}
                  disabled={!topic.trim() || isGenerating}
                  className="w-full bg-studius-primary hover:bg-studius-primary/90"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando questões...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Quiz
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Quizzes */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-studius-primary" />
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="bg-studius-card border-studius-border">
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum quiz ainda
              </h3>
              <p className="text-muted-foreground mb-4">
                Gere seu primeiro quiz com IA para testar seus conhecimentos
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-studius-primary hover:bg-studius-primary/90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <Card 
                key={quiz.id} 
                className="bg-studius-card border-studius-border hover:border-studius-primary/50 transition-colors group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium text-foreground line-clamp-1">
                        {quiz.title}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {quiz.topic}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={getDifficultyColor(quiz.difficulty)}>
                      {getDifficultyLabel(quiz.difficulty)}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {quiz.question_count} questões
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    Criado em {format(new Date(quiz.created_at), "dd 'de' MMM", { locale: ptBR })}
                  </div>

                  <Button
                    onClick={() => handleStartQuiz(quiz.id)}
                    className="w-full bg-studius-primary/10 text-studius-primary hover:bg-studius-primary hover:text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudiusLayout>
  );
}
