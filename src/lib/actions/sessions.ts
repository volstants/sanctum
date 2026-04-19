'use server';

import { createServiceClient } from '@/lib/supabase/service';
import type { SessionDiary, ProactiveSuggestion } from '@/lib/actions/ai';

// ── Session lifecycle ─────────────────────────────────────────────────────────

export async function createSession(realmId: string): Promise<string> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('sessions')
    .insert({ realm_id: realmId, started_at: new Date().toISOString() })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function endSession(sessionId: string): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw new Error(error.message);
}

// ── Transcripts ───────────────────────────────────────────────────────────────

export async function saveTranscript(
  sessionId: string,
  realmId: string,
  speaker: string,
  content: string,
  source: 'speech' | 'audio' = 'speech',
  recordedAt?: string,
): Promise<void> {
  if (!content.trim()) return;
  const sb = createServiceClient();
  const { error } = await sb.from('session_transcripts').insert({
    session_id:  sessionId,
    realm_id:    realmId,
    speaker,
    content,
    source,
    recorded_at: recordedAt ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function saveTranscriptBatch(
  sessionId: string,
  realmId: string,
  segments: { speaker: string; content: string; source?: 'speech' | 'audio'; recordedAt?: string }[],
): Promise<void> {
  if (segments.length === 0) return;
  const sb = createServiceClient();
  const rows = segments.map((s) => ({
    session_id:  sessionId,
    realm_id:    realmId,
    speaker:     s.speaker,
    content:     s.content,
    source:      s.source ?? 'speech',
    recorded_at: s.recordedAt ?? new Date().toISOString(),
  }));
  const { error } = await sb.from('session_transcripts').insert(rows);
  if (error) throw new Error(error.message);
}

// ── Suggestions ───────────────────────────────────────────────────────────────

export async function saveSuggestions(
  sessionId: string,
  realmId: string,
  suggestions: ProactiveSuggestion[],
): Promise<void> {
  if (suggestions.length === 0) return;
  const sb = createServiceClient();
  const rows = suggestions.map((s) => ({
    session_id:  sessionId,
    realm_id:    realmId,
    type:        s.type,
    title:       s.title,
    description: s.description,
    mechanic:    s.mechanic || null,
    source_ref:  s.source || null,
  }));
  const { error } = await sb.from('session_suggestions').insert(rows);
  if (error) throw new Error(error.message);
}

// ── Diary ─────────────────────────────────────────────────────────────────────

export async function saveSessionDiary(
  sessionId: string,
  diary: SessionDiary,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('sessions')
    .update({ diary_json: diary, title: diary.title })
    .eq('id', sessionId);
  if (error) throw new Error(error.message);
}

// ── History ───────────────────────────────────────────────────────────────────

export interface SessionSummary {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  transcript_count: number;
  suggestion_count: number;
  has_diary: boolean;
}

export async function getSessionHistory(realmId: string): Promise<SessionSummary[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('sessions')
    .select(`
      id, title, started_at, ended_at, diary_json,
      session_transcripts(count),
      session_suggestions(count)
    `)
    .eq('realm_id', realmId)
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((s) => ({
    id:               s.id,
    title:            s.title,
    started_at:       s.started_at,
    ended_at:         s.ended_at,
    transcript_count: (s.session_transcripts as unknown as { count: number }[])[0]?.count ?? 0,
    suggestion_count: (s.session_suggestions as unknown as { count: number }[])[0]?.count ?? 0,
    has_diary:        !!s.diary_json,
  }));
}

export interface SessionDetail {
  id: string;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  diary_json: SessionDiary | null;
  transcripts: { speaker: string; content: string; source: string; recorded_at: string }[];
  suggestions: { type: string; title: string; description: string; mechanic: string | null; created_at: string }[];
}

export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  const sb = createServiceClient();
  const [sessionRes, txRes, sugRes] = await Promise.all([
    sb.from('sessions').select('id,title,started_at,ended_at,diary_json').eq('id', sessionId).single(),
    sb.from('session_transcripts').select('speaker,content,source,recorded_at').eq('session_id', sessionId).order('recorded_at'),
    sb.from('session_suggestions').select('type,title,description,mechanic,created_at').eq('session_id', sessionId).order('created_at'),
  ]);
  if (sessionRes.error) throw new Error(sessionRes.error.message);
  return {
    ...sessionRes.data,
    diary_json:  sessionRes.data.diary_json as SessionDiary | null,
    transcripts: txRes.data ?? [],
    suggestions: sugRes.data ?? [],
  };
}
