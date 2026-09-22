-- Additional workflow statuses (additive)
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'document_verification';
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'officer_review';

-- Multi-step application form data (drafts)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS form_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Citizen preferences and MFA-ready security flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"inApp":true,"email":true,"sms":false,"slaAlerts":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_method text;

-- Notifications can reference an application
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS application_number text;

-- Uploaded documents with mock verification pipeline results
CREATE TABLE IF NOT EXISTS public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  citizen_id uuid NOT NULL,
  document_label text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  verification_status text NOT NULL DEFAULT 'pending',
  pipeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_documents TO authenticated;
GRANT ALL ON public.application_documents TO service_role;

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents own or demo select" ON public.application_documents
  FOR SELECT TO authenticated
  USING (citizen_id = auth.uid() OR is_demo);

CREATE POLICY "documents own insert" ON public.application_documents
  FOR INSERT TO authenticated
  WITH CHECK (citizen_id = auth.uid() AND is_demo = false);

CREATE POLICY "documents own update" ON public.application_documents
  FOR UPDATE TO authenticated
  USING (citizen_id = auth.uid());

CREATE POLICY "documents own delete" ON public.application_documents
  FOR DELETE TO authenticated
  USING (citizen_id = auth.uid());

CREATE INDEX IF NOT EXISTS application_documents_application_idx
  ON public.application_documents(application_id);
