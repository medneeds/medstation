-- Tabela para quizzes
CREATE TABLE public.studius_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  question_count INTEGER NOT NULL DEFAULT 10,
  time_limit_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para questões do quiz
CREATE TABLE public.studius_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.studius_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  question_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para tentativas de quiz
CREATE TABLE public.studius_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.studius_quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.studius_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Políticas para studius_quizzes
CREATE POLICY "Users can view own quizzes" ON public.studius_quizzes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quizzes" ON public.studius_quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes" ON public.studius_quizzes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quizzes" ON public.studius_quizzes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para studius_quiz_questions
CREATE POLICY "Users can view questions from own quizzes" ON public.studius_quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.studius_quizzes
      WHERE studius_quizzes.id = studius_quiz_questions.quiz_id
      AND studius_quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create questions in own quizzes" ON public.studius_quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studius_quizzes
      WHERE studius_quizzes.id = studius_quiz_questions.quiz_id
      AND studius_quizzes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions from own quizzes" ON public.studius_quiz_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.studius_quizzes
      WHERE studius_quizzes.id = studius_quiz_questions.quiz_id
      AND studius_quizzes.user_id = auth.uid()
    )
  );

-- Políticas para studius_quiz_attempts
CREATE POLICY "Users can view own attempts" ON public.studius_quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts" ON public.studius_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts" ON public.studius_quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);