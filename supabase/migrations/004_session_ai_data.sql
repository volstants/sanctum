-- ═══════════════════════════════════════════════════
--  Migration 004 — AI session data: transcripts & suggestions
--  Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- ── Voice transcripts ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_transcripts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  realm_id    uuid NOT NULL REFERENCES public.realms(id)   ON DELETE CASCADE,
  speaker     text NOT NULL DEFAULT 'Narrador',
  content     text NOT NULL,
  source      text NOT NULL DEFAULT 'speech', -- 'speech' | 'audio'
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_transcripts_session_id ON public.session_transcripts(session_id);
CREATE INDEX session_transcripts_realm_id   ON public.session_transcripts(realm_id);

ALTER TABLE public.session_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcripts_narrator_all" ON public.session_transcripts
  FOR ALL USING (public.is_narrator(realm_id));

CREATE POLICY "transcripts_member_select" ON public.session_transcripts
  FOR SELECT USING (public.is_realm_member(realm_id));

-- ── Co-Master suggestions ────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  realm_id    uuid NOT NULL REFERENCES public.realms(id)   ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('rule','npc','plot','encounter','ability')),
  title       text NOT NULL,
  description text NOT NULL,
  mechanic    text,
  source_ref  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_suggestions_session_id ON public.session_suggestions(session_id);
CREATE INDEX session_suggestions_realm_id   ON public.session_suggestions(realm_id);

ALTER TABLE public.session_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestions_narrator_all" ON public.session_suggestions
  FOR ALL USING (public.is_narrator(realm_id));

CREATE POLICY "suggestions_member_select" ON public.session_suggestions
  FOR SELECT USING (public.is_realm_member(realm_id));

-- ── Ensure sessions has diary_json (idempotent) ──────
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS title    text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS diary_json jsonb;
