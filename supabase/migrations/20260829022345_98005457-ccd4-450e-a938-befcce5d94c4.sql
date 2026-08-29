ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS routine_pains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_settings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_goals text[] NOT NULL DEFAULT '{}';

UPDATE public.user_onboarding
   SET routine_pains = ARRAY[routine_pain]
 WHERE routine_pain IS NOT NULL
   AND coalesce(array_length(routine_pains, 1), 0) = 0;

UPDATE public.user_onboarding
   SET work_settings = ARRAY[work_setting]
 WHERE work_setting IS NOT NULL
   AND coalesce(array_length(work_settings, 1), 0) = 0;

UPDATE public.user_onboarding
   SET primary_goals = ARRAY[primary_goal]
 WHERE primary_goal IS NOT NULL
   AND coalesce(array_length(primary_goals, 1), 0) = 0;