-- ═══════════════════════════════════════════════════
--  Migration 003 — Journal (Handouts) + Character extensions
--  Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Extend characters with journal fields
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS avatar_token_url text;
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS player_user_ids uuid[] DEFAULT '{}';
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS is_npc boolean DEFAULT false;

-- ── Handouts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.handouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realm_id        uuid NOT NULL REFERENCES public.realms(id) ON DELETE CASCADE,
  name            text NOT NULL,
  content         text DEFAULT '',
  image_url       text,
  tags            text[] DEFAULT '{}',
  visible_to_players boolean DEFAULT false,
  player_user_ids uuid[] DEFAULT '{}',
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX handouts_realm_id ON public.handouts(realm_id);
ALTER TABLE public.handouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handouts_narrator_all" ON public.handouts
  FOR ALL USING (public.is_narrator(realm_id));

CREATE POLICY "handouts_player_select" ON public.handouts
  FOR SELECT USING (
    public.is_realm_member(realm_id)
    AND (
      visible_to_players = true
      OR auth.uid() = ANY(player_user_ids)
    )
  );

-- ── Session logs ────────────────────────────────────
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS diary_json jsonb;

-- ── Storage bucket for handout images ───────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'handouts',
  'handouts',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "handouts_storage_narrator" ON storage.objects
  FOR ALL USING (
    bucket_id = 'handouts'
    AND public.is_narrator(CAST(SPLIT_PART(name, '/', 1) AS uuid))
  );

CREATE POLICY "handouts_storage_player_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'handouts'
    AND public.is_realm_member(CAST(SPLIT_PART(name, '/', 1) AS uuid))
  );
