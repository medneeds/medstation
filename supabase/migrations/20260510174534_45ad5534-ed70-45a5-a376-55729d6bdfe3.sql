-- Drop Studius - removed from MedStation as it became an independent project
DROP VIEW IF EXISTS public.studius_leaderboard CASCADE;
DROP TABLE IF EXISTS public.studius_user_achievements CASCADE;
DROP TABLE IF EXISTS public.studius_achievements CASCADE;
DROP TABLE IF EXISTS public.studius_quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.studius_quiz_questions CASCADE;
DROP TABLE IF EXISTS public.studius_quizzes CASCADE;
DROP TABLE IF EXISTS public.studius_flashcard_reviews CASCADE;
DROP TABLE IF EXISTS public.studius_flashcards CASCADE;
DROP TABLE IF EXISTS public.studius_decks CASCADE;
DROP TABLE IF EXISTS public.studius_messages CASCADE;
DROP TABLE IF EXISTS public.studius_conversations CASCADE;
DROP TABLE IF EXISTS public.studius_user_progress CASCADE;
DROP TABLE IF EXISTS public.studius_stats CASCADE;
DROP TABLE IF EXISTS public.studius_preferences CASCADE;
DROP FUNCTION IF EXISTS public.update_deck_card_count() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level(integer) CASCADE;