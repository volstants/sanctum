import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ChannelList } from '@/components/layout/ChannelList';

interface Props {
  children: React.ReactNode;
  params: Promise<{ realmId: string }>;
}

export default async function RealmLayout({ children, params }: Props) {
  const { realmId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: realm }, { data: channels }, { data: members }, { data: membership }] =
    await Promise.all([
      supabase.from('realms').select('*').eq('id', realmId).single(),
      supabase.from('channels').select('*').eq('realm_id', realmId).order('position'),
      supabase.from('realm_members').select('*').eq('realm_id', realmId),
      supabase
        .from('realm_members')
        .select('role')
        .eq('realm_id', realmId)
        .eq('user_id', user.id)
        .single(),
    ]);

  if (!realm || !membership) notFound();

  const isNarrator = membership.role === 'narrator';

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* Column 2: Channel list (240px) */}
      <ChannelList
        realm={realm}
        channels={channels ?? []}
        members={members ?? []}
        activeChannelId={null}
        currentUserId={user.id}
        isNarrator={isNarrator}
      />

      {/* Column 3: Main area */}
      <main className="flex-1 min-w-0 overflow-hidden bg-[var(--bg-tertiary)]">
        {children}
      </main>
    </div>
  );
}
