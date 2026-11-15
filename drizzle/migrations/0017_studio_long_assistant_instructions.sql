ALTER TABLE public.studio_assistants DROP CONSTRAINT IF EXISTS studio_assistants_instructions_check;
ALTER TABLE public.studio_assistants ADD CONSTRAINT studio_assistants_instructions_check CHECK (char_length(instructions) <= 40000);
ALTER TABLE public.prompt_library_items DROP CONSTRAINT IF EXISTS prompt_library_items_content_check;
ALTER TABLE public.prompt_library_items ADD CONSTRAINT prompt_library_items_content_check CHECK (char_length(btrim(content)) BETWEEN 20 AND 40000);