'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export interface JournalCharacter {
  id: string;
  realm_id: string;
  user_id: string;
  name: string;
  class: string;
  level: number;
  hp: number;
  max_hp: number;
  stats: Record<string, number>;
  avatar_url: string | null;
  avatar_token_url: string | null;
  bio: string | null;
  notes: string | null;
  inventory: string | null;
  tags: string[];
  player_user_ids: string[];
  is_npc: boolean;
  created_at: string;
}

export interface JournalHandout {
  id: string;
  realm_id: string;
  name: string;
  content: string;
  image_url: string | null;
  tags: string[];
  visible_to_players: boolean;
  player_user_ids: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function assertNarrator(realmId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const service = createServiceClient();
  const { data: m } = await service.from('realm_members').select('role').eq('realm_id', realmId).eq('user_id', user.id).single();
  if (m?.role !== 'narrator') throw new Error('Narrator only');
  return { user, service };
}

// ── Characters ────────────────────────────────────────────────────────────────

export async function getJournalCharacters(realmId: string): Promise<JournalCharacter[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const service = createServiceClient();
  const { data } = await service.from('characters').select('*').eq('realm_id', realmId).order('name');
  return (data as JournalCharacter[]) ?? [];
}

export async function createCharacter(realmId: string, data: Partial<JournalCharacter>): Promise<{ error?: string; id?: string }> {
  const { user, service } = await assertNarrator(realmId);
  const { data: char, error } = await service.from('characters').insert({
    realm_id: realmId,
    user_id: user.id,
    name: data.name ?? 'Unnamed',
    class: data.class ?? '',
    level: data.level ?? 1,
    hp: data.hp ?? 10,
    max_hp: data.max_hp ?? 10,
    stats: data.stats ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    bio: data.bio ?? '',
    notes: data.notes ?? '',
    tags: data.tags ?? [],
    is_npc: data.is_npc ?? false,
  }).select('id').single();
  if (error) return { error: error.message };
  revalidatePath(`/app/realm/${realmId}`);
  return { id: char.id };
}

export async function updateCharacter(id: string, realmId: string, patch: Partial<JournalCharacter>): Promise<{ error?: string }> {
  await assertNarrator(realmId);
  const service = createServiceClient();
  const { error } = await service.from('characters').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/app/realm/${realmId}`);
  return {};
}

export async function deleteCharacter(id: string, realmId: string): Promise<{ error?: string }> {
  await assertNarrator(realmId);
  const service = createServiceClient();
  await service.from('characters').delete().eq('id', id);
  revalidatePath(`/app/realm/${realmId}`);
  return {};
}

// ── Handouts ──────────────────────────────────────────────────────────────────

export async function getHandouts(realmId: string): Promise<JournalHandout[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const service = createServiceClient();
  const { data } = await service.from('handouts').select('*').eq('realm_id', realmId).order('name');
  return (data as JournalHandout[]) ?? [];
}

export async function createHandout(realmId: string, data: Partial<JournalHandout>): Promise<{ error?: string; id?: string }> {
  const { user, service } = await assertNarrator(realmId);
  const { data: h, error } = await service.from('handouts').insert({
    realm_id: realmId,
    name: data.name ?? 'Untitled Handout',
    content: data.content ?? '',
    image_url: data.image_url ?? null,
    tags: data.tags ?? [],
    visible_to_players: data.visible_to_players ?? false,
    player_user_ids: data.player_user_ids ?? [],
    created_by: user.id,
  }).select('id').single();
  if (error) return { error: error.message };
  revalidatePath(`/app/realm/${realmId}`);
  return { id: h.id };
}

export async function updateHandout(id: string, realmId: string, patch: Partial<JournalHandout>): Promise<{ error?: string }> {
  await assertNarrator(realmId);
  const service = createServiceClient();
  const { error } = await service.from('handouts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/app/realm/${realmId}`);
  return {};
}

export async function deleteHandout(id: string, realmId: string): Promise<void> {
  await assertNarrator(realmId);
  const service = createServiceClient();
  await service.from('handouts').delete().eq('id', id);
  revalidatePath(`/app/realm/${realmId}`);
}
