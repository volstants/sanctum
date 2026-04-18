import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
import { ChannelView } from '@/components/layout/ChannelView';
import type { Message } from '@/types';

interface Props {
  params: Promise<{ realmId: string; channelId: string }>;
}

export default async function ChannelPage({ params }: Props) {
  const { realmId, channelId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: channel }, { data: membership }, { data: messages }] = await Promise.all([
    service.from('channels').select('*').eq('id', channelId).single(),
    service.from('realm_members').select('role, display_name').eq('realm_id', realmId).eq('user_id', user.id).single(),
    service.from('messages')
      .select('*, profiles(id, display_name, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100),
  ]);

  if (!channel || !membership) notFound();

  return (
    <ChannelView
      channel={channel}
      realmId={realmId}
      userId={user.id}
      isNarrator={membership.role === 'narrator'}
      displayName={membership.display_name}
      initialMessages={(messages as Message[]) ?? []}
    />
  );
}
