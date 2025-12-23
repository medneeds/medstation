import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Trophy,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
}

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: (
    answers: { questionIndex: number; selectedAnswer: number }[],
    timeSpentSeconds: number
  ) => void;
  onCancel: () => void;
}

export default function QuizPlayer({ questions, onComplete, onCancel }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionIndex: number; selectedAnswer: number }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Timer
  useEffect(() => {
    if (isCompleted) return;
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex: number) => {
    if (showResult) return;
    setSelectedOption(optionIndex);
  };

  const handleConfirm = () => {
    if (selectedOption === null) return;

    const newAnswers = [...answers, { questionIndex: currentIndex, selectedAnswer: selectedOption }];
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setIsCompleted(true);
      onComplete(answers, timeSpent);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && !showResult) {
      setCurrentIndex(prev => prev - 1);
      // Restaurar resposta anterior se existir
      const prevAnswer = answers.find(a => a.questionIndex === currentIndex - 1);
      setSelectedOption(prevAnswer?.selectedAnswer ?? null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return difficulty;
    }
  };

  if (isCompleted) {
    const correctCount = answers.filter((answer, idx) => {
      const question = questions[answer.questionIndex];
      return question && answer.selectedAnswer === question.correct_answer;
    }).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <Card className="max-w-2xl mx-auto bg-studius-card border-studius-border">
        <CardContent className="pt-8 text-center">
          <div className="mb-6">
            <Trophy className={cn(
              "h-16 w-16 mx-auto mb-4",
              score >= 70 ? "text-yellow-400" : "text-muted-foreground"
            )} />
            <h2 className="text-2xl font-bold text-foreground mb-2">Quiz Finalizado!</h2>
            <p className="text-muted-foreground">
              Você acertou {correctCount} de {questions.length} questões
            </p>
          </div>

          <div className="mb-8">
            <div className={cn(
              "text-6xl font-bold mb-2",
              score >= 70 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400"
            )}>
              {score}%
            </div>
            <p className="text-sm text-muted-foreground">
              Tempo: {formatTime(timeSpent)}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Voltar aos Quizzes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Questão {currentIndex + 1} de {questions.length}
          </span>
          <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
            {getDifficultyLabel(currentQuestion.difficulty)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="font-mono">{formatTime(timeSpent)}</span>
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2 mb-6" />

      {/* Question Card */}
      <Card className="bg-studius-card border-studius-border mb-6">
        <CardContent className="pt-6">
          <p className="text-lg text-foreground mb-6 leading-relaxed">
            {currentQuestion.question_text}
          </p>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = currentQuestion.correct_answer === idx;
              const showCorrectness = showResult;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={showResult}
                  className={cn(
                    "w-full p-4 rounded-lg border text-left transition-all",
                    "flex items-start gap-3",
                    !showResult && isSelected && "border-studius-primary bg-studius-primary/10",
                    !showResult && !isSelected && "border-studius-border hover:border-studius-primary/50 bg-studius-muted/50",
                    showResult && isCorrect && "border-green-500 bg-green-500/10",
                    showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                    showResult && "cursor-default"
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                    !showResult && isSelected && "bg-studius-primary text-white",
                    !showResult && !isSelected && "bg-studius-muted text-muted-foreground",
                    showResult && isCorrect && "bg-green-500 text-white",
                    showResult && isSelected && !isCorrect && "bg-red-500 text-white"
                  )}>
                    {showResult && isCorrect && <CheckCircle2 className="h-4 w-4" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                    {!showResult && String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-foreground">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showResult && (
            <div className="mt-6 p-4 rounded-lg bg-studius-muted/50 border border-studius-border">
              <h4 className="font-semibold text-foreground mb-2">Explicação:</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-muted-foreground"
        >
          Cancelar
        </Button>

        <div className="flex gap-3">
          {!showResult ? (
            <Button
              onClick={handleConfirm}
              disabled={selectedOption === null}
              className="bg-studius-primary hover:bg-studius-primary/90"
            >
              Confirmar
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-studius-primary hover:bg-studius-primary/90"
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  Próxima
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Finalizar
                  <Trophy className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
