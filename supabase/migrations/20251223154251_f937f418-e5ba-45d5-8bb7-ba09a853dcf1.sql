-- Tabela para preferências do Studius por usuário
CREATE TABLE public.studius_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialty TEXT,
  goals TEXT[] DEFAULT '{}',
  study_level TEXT DEFAULT 'graduation',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Tabela para sessões de chat do Studius
CREATE TABLE public.studius_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  last_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para mensagens do chat Studius
CREATE TABLE public.studius_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.studius_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para estatísticas de estudo
CREATE TABLE public.studius_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  study_time_minutes INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  flashcards_reviewed INTEGER DEFAULT 0,
  articles_read INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, study_date)
);

-- Enable RLS
ALTER TABLE public.studius_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studius_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for studius_preferences
CREATE POLICY "Users can view own preferences" ON public.studius_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own preferences" ON public.studius_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.studius_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for studius_conversations
CREATE POLICY "Users can view own conversations" ON public.studius_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.studius_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.studius_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.studius_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for studius_messages (via conversation ownership)
CREATE POLICY "Users can view messages from own conversations" ON public.studius_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.studius_conversations
      WHERE id = studius_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON public.studius_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studius_conversations
      WHERE id = studius_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for studius_stats
CREATE POLICY "Users can view own stats" ON public.studius_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stats" ON public.studius_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.studius_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_studius_preferences_updated_at
  BEFORE UPDATE ON public.studius_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_studius_conversations_updated_at
  BEFORE UPDATE ON public.studius_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_studius_stats_updated_at
  BEFORE UPDATE ON public.studius_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();