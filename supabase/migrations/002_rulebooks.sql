-- ═══════════════════════════════════════════════════
--  Migration 002 — RPG System & Rulebooks
--  Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Add rpg_system to realms
ALTER TABLE public.realms ADD COLUMN IF NOT EXISTS rpg_system text;

-- ── Rulebooks (uploaded PDFs with extracted rules) ──
CREATE TABLE IF NOT EXISTS public.rulebooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id        uuid NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
  name            text NOT NULL,
  storage_path    text NOT NULL,
  extracted_text  text,
  page_count      integer,
  file_size       bigint,
  status          text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  error_message   text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX rulebooks_realm_id ON public.rulebooks(realm_id);

ALTER TABLE public.rulebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rulebooks_select" ON public.rulebooks
  FOR SELECT USING (public.is_realm_member(realm_id));

CREATE POLICY "rulebooks_insert" ON public.rulebooks
  FOR INSERT WITH CHECK (public.is_narrator(realm_id));

CREATE POLICY "rulebooks_update" ON public.rulebooks
  FOR UPDATE USING (public.is_narrator(realm_id));

CREATE POLICY "rulebooks_delete" ON public.rulebooks
  FOR DELETE USING (public.is_narrator(realm_id));

-- ── Storage bucket for PDFs ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rulebooks',
  'rulebooks',
  false,
  52428800,  -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rulebooks_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'rulebooks'
    AND public.is_realm_member(CAST(SPLIT_PART(name, '/', 1) AS uuid))
  );

CREATE POLICY "rulebooks_storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'rulebooks'
    AND public.is_narrator(CAST(SPLIT_PART(name, '/', 1) AS uuid))
  );

CREATE POLICY "rulebooks_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'rulebooks'
    AND public.is_narrator(CAST(SPLIT_PART(name, '/', 1) AS uuid))
  );
