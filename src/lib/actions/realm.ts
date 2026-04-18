'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createRealm(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!name) return { error: 'Name is required' };

  // Use service client to bypass RLS for write — auth is verified above
  const service = createServiceClient();
  const { data: realm, error } = await service
    .from('realms')
    .insert({ name, description: description || null, owner_id: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/app');
  redirect(`/app/realm/${realm.id}`);
}

export async function joinRealm(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const code = String(formData.get('code') ?? '').trim().toLowerCase();
  if (!code) return { error: 'Invite code required' };

  const { data: realm, error: realmErr } = await supabase
    .from('realms')
    .select('id, name')
    .eq('invite_code', code)
    .single();

  if (realmErr || !realm) return { error: 'Invalid invite code' };

  // Already a member?
  const { data: existing } = await supabase
    .from('realm_members')
    .select('user_id')
    .eq('realm_id', realm.id)
    .eq('user_id', user.id)
    .single();

  if (existing) redirect(`/app/realm/${realm.id}`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const { error: joinErr } = await supabase.from('realm_members').insert({
    realm_id: realm.id,
    user_id: user.id,
    role: 'player',
    display_name: profile?.display_name ?? 'Adventurer',
  });

  if (joinErr) return { error: joinErr.message };

  revalidatePath('/app');
  redirect(`/app/realm/${realm.id}`);
}

export async function deleteRealm(realmId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { error } = await supabase
    .from('realms')
    .delete()
    .eq('id', realmId)
    .eq('owner_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/app');
  redirect('/app');
}

export async function kickMember(realmId: string, userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Only narrator can kick
  const { data: membership } = await supabase
    .from('realm_members')
    .select('role')
    .eq('realm_id', realmId)
    .eq('user_id', user.id)
    .single();

  if (membership?.role !== 'narrator') return { error: 'Not authorized' };

  await supabase
    .from('realm_members')
    .delete()
    .eq('realm_id', realmId)
    .eq('user_id', userId);

  revalidatePath(`/app/realm/${realmId}`);
}

export async function leaveRealm(realmId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  await supabase
    .from('realm_members')
    .delete()
    .eq('realm_id', realmId)
    .eq('user_id', user.id);

  revalidatePath('/app');
  redirect('/app');
}
