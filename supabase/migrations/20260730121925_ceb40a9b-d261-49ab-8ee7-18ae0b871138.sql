-- 1. Fix mutable search_path on email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = 'pgmq, public';
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = 'pgmq, public';
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = 'pgmq, public';
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = 'pgmq, public';

-- 2. Revoke EXECUTE on internal SECURITY DEFINER / trigger functions from public API roles
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.delete_email(text, bigint)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.email_queue_wake()',
    'public.email_queue_dispatch()',
    'public.create_notification(uuid, text, text, text, text, uuid)',
    'public.create_admin_notification(text, text, text, text, text, uuid, jsonb)',
    'public.cleanup_old_rate_limits()',
    'public.handle_new_user()',
    'public.handle_updated_at()',
    'public.update_updated_at_column()',
    'public.save_note_version()',
    'public.notify_admin_new_user()',
    'public.notify_admin_referral_converted()',
    'public.notify_admin_support_ticket()',
    'public.notify_exam_request_completed()',
    'public.notify_exam_request_created()',
    'public.notify_prescription_pending_signature()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- Functions the app legitimately calls: keep authenticated only, drop anon/PUBLIC
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.has_role(uuid, app_role)',
    'public.is_staff(uuid)',
    'public.has_active_courtesy(uuid)',
    'public.search_cases(text, uuid)',
    'public.generate_document_number(text)',
    'public.generate_exam_request_number()',
    'public.generate_prescription_number()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- 3. email_send_log: scope service-role policies to the service_role grantee
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;

CREATE POLICY "Service role can insert send log"
  ON public.email_send_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can read send log"
  ON public.email_send_log FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can update send log"
  ON public.email_send_log FOR UPDATE TO service_role USING (true) WITH CHECK (true);

REVOKE INSERT, UPDATE ON public.email_send_log FROM anon, authenticated;

-- 4. page_views: replace always-true insert check with validated input
DROP POLICY IF EXISTS "Anyone can log a page view" ON public.page_views;
CREATE POLICY "Anyone can log a page view"
  ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (
    path IS NOT NULL
    AND length(path) BETWEEN 1 AND 512
    AND coalesce(length(referrer), 0) <= 1024
    AND coalesce(length(session_id), 0) <= 128
    AND coalesce(length(user_agent), 0) <= 512
    AND coalesce(length(device), 0) <= 64
    AND coalesce(length(country), 0) <= 64
  );

-- 5. avatars bucket: stop allowing clients to list every file (public URLs still work)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Users can list their own avatar files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);