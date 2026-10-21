ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_graduation_year;
ALTER TABLE public.profiles ADD CONSTRAINT check_graduation_year CHECK (
  graduation_year IS NULL OR (
    graduation_year >= 1950 AND graduation_year::numeric <= EXTRACT(year FROM CURRENT_DATE)
      + CASE WHEN professional_status = 'interno' THEN 10 ELSE 0 END
  )
);