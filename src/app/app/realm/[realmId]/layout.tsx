import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
import { ChannelList } from '@/components/layout/ChannelList';
import { RightSidebar } from '@/components/layout/RightSidebar';
import type { JournalCharacter, JournalHandout } from '@/lib/actions/journal';

interface Props {
  children: React.ReactNode;
  params: Promise<{ realmId: string }>;
}

export default async function RealmLayout({ children, params }: Props) {
  const { realmId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [
    { data: realm },
    { data: channels },
    { data: members },
    { data: membership },
    { data: characters },
    { data: handouts },
  ] = await Promise.all([
    service.from('realms').select('*').eq('id', realmId).single(),
    service.from('channels').select('*').eq('realm_id', realmId).order('position'),
    service.from('realm_members').select('*').eq('realm_id', realmId),
    service.from('realm_members').select('role').eq('realm_id', realmId).eq('user_id', user.id).single(),
    service.from('characters').select('*').eq('realm_id', realmId).order('name'),
    service.from('handouts').select('id,realm_id,name,content,image_url,tags,visible_to_players,player_user_ids,created_by,created_at,updated_at').eq('realm_id', realmId).order('name'),
  ]);

  if (!realm || !membership) notFound();

  const isNarrator = membership.role === 'narrator';

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      <ChannelList
        realm={realm}
        channels={channels ?? []}
        members={members ?? []}
        activeChannelId={null}
        currentUserId={user.id}
        isNarrator={isNarrator}
      />
      <main className="flex-1 min-w-0 overflow-hidden bg-[var(--bg-tertiary)]">
        {children}
      </main>
      <RightSidebar
        realmId={realmId}
        realmSystem={realm.rpg_system ?? null}
        isNarrator={isNarrator}
        initialCharacters={(characters as JournalCharacter[]) ?? []}
        initialHandouts={(handouts as JournalHandout[]) ?? []}
      />
    </div>
  );
}
