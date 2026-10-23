ALTER TABLE public.stripe_one_time_purchases
  DROP CONSTRAINT IF EXISTS stripe_one_time_purchases_payment_method_check;
ALTER TABLE public.stripe_one_time_purchases
  ADD CONSTRAINT stripe_one_time_purchases_payment_method_check
    CHECK (payment_method IN ('card','pix','boleto','unknown'));