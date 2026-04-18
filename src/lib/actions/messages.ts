'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Message } from '@/types';

export async function sendMessage({
  channelId,
  content,
  isNarrator,
  metadata,
}: {
  channelId: string;
  content: string;
  isNarrator: boolean;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const service = createServiceClient();
  const { error } = await service.from('messages').insert({
    channel_id: channelId,
    user_id: user.id,
    content,
    is_narrator: isNarrator,
    metadata: metadata && Object.keys(metadata).length ? metadata : null,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export async function fetchMessages(channelId: string, after?: string): Promise<Message[]> {
  const service = createServiceClient();
  let query = service
    .from('messages')
    .select('*, profiles(id, display_name, avatar_url)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (after) query = query.gt('created_at', after);

  const { data } = await query;
  return (data as Message[]) ?? [];
}
