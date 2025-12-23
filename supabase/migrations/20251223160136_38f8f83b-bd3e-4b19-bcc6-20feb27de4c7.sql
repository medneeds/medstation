-- Add gamification columns to studius_stats
ALTER TABLE public.studius_stats
ADD COLUMN IF NOT EXISTS xp_earned integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_date date DEFAULT NULL;

-- Create user levels table
CREATE TABLE public.studius_user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_xp integer DEFAULT 0 NOT NULL,
  current_level integer DEFAULT 1 NOT NULL,
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_activity_date date DEFAULT NULL,
  is_public boolean DEFAULT true NOT NULL,
  display_name text DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create achievements definition table
CREATE TABLE public.studius_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  xp_reward integer DEFAULT 0 NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  category text DEFAULT 'general' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create user achievements table
CREATE TABLE public.studius_user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES public.studius_achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.studius_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS for studius_user_progress
CREATE POLICY "Users can view own progress" ON public.studius_user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public progress for leaderboard" ON public.studius_user_progress
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert own progress" ON public.studius_user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.studius_user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS for achievements (public read)
CREATE POLICY "Anyone can view achievements" ON public.studius_achievements
  FOR SELECT USING (true);

-- RLS for user achievements
CREATE POLICY "Users can view own achievements" ON public.studius_user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public user achievements" ON public.studius_user_achievements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.studius_user_progress
      WHERE studius_user_progress.user_id = studius_user_achievements.user_id
      AND studius_user_progress.is_public = true
    )
  );

CREATE POLICY "Users can insert own achievements" ON public.studius_user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_studius_user_progress_updated_at
  BEFORE UPDATE ON public.studius_user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default achievements
INSERT INTO public.studius_achievements (code, name, description, icon, xp_reward, requirement_type, requirement_value, category) VALUES
  ('first_message', 'Primeira Pergunta', 'Envie sua primeira mensagem no chat', 'MessageCircle', 10, 'messages_sent', 1, 'chat'),
  ('chat_10', 'Curioso', 'Envie 10 mensagens no chat', 'MessageSquare', 25, 'messages_sent', 10, 'chat'),
  ('chat_50', 'Estudante Dedicado', 'Envie 50 mensagens no chat', 'GraduationCap', 50, 'messages_sent', 50, 'chat'),
  ('chat_100', 'Mestre das Perguntas', 'Envie 100 mensagens no chat', 'Trophy', 100, 'messages_sent', 100, 'chat'),
  ('streak_3', 'Consistente', 'Mantenha um streak de 3 dias', 'Flame', 30, 'streak_days', 3, 'streak'),
  ('streak_7', 'Uma Semana Forte', 'Mantenha um streak de 7 dias', 'Zap', 70, 'streak_days', 7, 'streak'),
  ('streak_30', 'Mês de Dedicação', 'Mantenha um streak de 30 dias', 'Crown', 300, 'streak_days', 30, 'streak'),
  ('study_60', 'Hora de Estudo', 'Estude por 60 minutos no total', 'Clock', 40, 'study_time', 60, 'time'),
  ('study_300', '5 Horas', 'Estude por 5 horas no total', 'Timer', 100, 'study_time', 300, 'time'),
  ('study_1000', 'Maratonista', 'Estude por mais de 16 horas', 'Rocket', 250, 'study_time', 1000, 'time');

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(xp integer)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(xp / 100.0))::integer + 1)
$$;