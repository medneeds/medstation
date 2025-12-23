import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from './useGamification';
import { Json } from '@/integrations/supabase/types';

interface QuizQuestion {
  id?: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  question_order?: number;
}

interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  topic: string;
  difficulty: string;
  question_count: number;
  time_limit_minutes?: number;
  created_at: string;
}

interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  answers: QuizAnswer[];
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent_seconds?: number | null;
  started_at: string;
  completed_at?: string | null;
}

export function useQuizzes() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { addXpAsync } = useGamification();

  const fetchQuizzes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('studius_quizzes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar quizzes:', error);
      return [];
    }

    return data as Quiz[];
  };

  const fetchQuizWithQuestions = async (quizId: string) => {
    const { data: quiz, error: quizError } = await supabase
      .from('studius_quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError) {
      console.error('Erro ao buscar quiz:', quizError);
      return null;
    }

    const { data: questions, error: questionsError } = await supabase
      .from('studius_quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('question_order', { ascending: true });

    if (questionsError) {
      console.error('Erro ao buscar questões:', questionsError);
      return null;
    }

    return {
      quiz: quiz as Quiz,
      questions: questions as QuizQuestion[]
    };
  };

  const generateQuiz = async (
    topic: string,
    difficulty: string = 'medium',
    questionCount: number = 10,
    userLevel?: string,
    specialty?: string
  ) => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Chamar a edge function para gerar questões
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topic, difficulty, questionCount, userLevel, specialty }
      });

      if (error) throw error;
      if (!data?.success || !data?.questions) {
        throw new Error(data?.error || 'Erro ao gerar questões');
      }

      // Criar o quiz no banco
      const { data: quiz, error: quizError } = await supabase
        .from('studius_quizzes')
        .insert({
          user_id: user.id,
          title: `Quiz: ${topic}`,
          topic,
          difficulty,
          question_count: data.questions.length
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Inserir as questões
      const questionsToInsert = data.questions.map((q: QuizQuestion, index: number) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        question_order: index
      }));

      const { error: questionsError } = await supabase
        .from('studius_quiz_questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: 'Quiz gerado!',
        description: `${data.questions.length} questões sobre ${topic}`,
      });

      return quiz;
    } catch (error) {
      console.error('Erro ao gerar quiz:', error);
      toast({
        title: 'Erro ao gerar quiz',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const startAttempt = async (quizId: string, totalQuestions: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('studius_quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        total_questions: totalQuestions,
        answers: []
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao iniciar tentativa:', error);
      return null;
    }

    return {
      ...data,
      answers: data.answers as unknown as QuizAnswer[],
    } as QuizAttempt;
  };

  const submitAttempt = async (
    attemptId: string,
    answers: QuizAnswer[],
    questions: QuizQuestion[],
    timeSpentSeconds: number
  ) => {
    setIsLoading(true);
    try {
      // Calcular pontuação
      let correctCount = 0;
      answers.forEach(answer => {
        const question = questions[answer.questionIndex];
        if (question && answer.selectedAnswer === question.correct_answer) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / questions.length) * 100);

      const { data, error } = await supabase
        .from('studius_quiz_attempts')
        .update({
          answers: answers as unknown as Json,
          score,
          correct_answers: correctCount,
          time_spent_seconds: timeSpentSeconds,
          completed_at: new Date().toISOString()
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) throw error;

      // Adicionar XP baseado no desempenho
      const xpEarned = Math.round(correctCount * 15 + (score >= 70 ? 25 : 0));
      await addXpAsync({ amount: xpEarned, reason: 'Quiz completado' });

      toast({
        title: 'Quiz finalizado!',
        description: `Você acertou ${correctCount} de ${questions.length} questões (${score}%)`,
      });

      return {
        ...data,
        answers: data.answers as unknown as QuizAnswer[],
        time_spent_seconds: data.time_spent_seconds,
        completed_at: data.completed_at
      } as QuizAttempt;
    } catch (error) {
      console.error('Erro ao submeter tentativa:', error);
      toast({
        title: 'Erro ao salvar resultado',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttempts = async (quizId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('studius_quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (quizId) {
      query = query.eq('quiz_id', quizId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar tentativas:', error);
      return [];
    }

    return (data || []).map(d => ({
      ...d,
      answers: d.answers as unknown as QuizAnswer[],
    })) as QuizAttempt[];
  };

  const deleteQuiz = async (quizId: string) => {
    const { error } = await supabase
      .from('studius_quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      console.error('Erro ao deletar quiz:', error);
      toast({
        title: 'Erro ao deletar quiz',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Quiz deletado',
    });
    return true;
  };

  return {
    isLoading,
    isGenerating,
    fetchQuizzes,
    fetchQuizWithQuestions,
    generateQuiz,
    startAttempt,
    submitAttempt,
    fetchAttempts,
    deleteQuiz
  };
}
