import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ChannelView } from '@/components/layout/ChannelView';

interface Props {
  params: Promise<{ realmId: string; channelId: string }>;
}

export default async function ChannelPage({ params }: Props) {
  const { realmId, channelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: channel }, { data: membership }] = await Promise.all([
    supabase.from('channels').select('*').eq('id', channelId).single(),
    supabase
      .from('realm_members')
      .select('role, display_name')
      .eq('realm_id', realmId)
      .eq('user_id', user.id)
      .single(),
  ]);

  if (!channel || !membership) notFound();

  return (
    <ChannelView
      channel={channel}
      realmId={realmId}
      userId={user.id}
      isNarrator={membership.role === 'narrator'}
      displayName={membership.display_name}
    />
  );
}
