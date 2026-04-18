import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
import { RealmSettings } from '@/components/layout/RealmSettings';
import type { Rulebook } from '@/types';

interface Props {
  params: Promise<{ realmId: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { realmId } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: realm }, { data: members }, { data: membership }, { data: rulebooks }] = await Promise.all([
    service.from('realms').select('*').eq('id', realmId).single(),
    service.from('realm_members').select('*').eq('realm_id', realmId),
    service.from('realm_members').select('role').eq('realm_id', realmId).eq('user_id', user.id).single(),
    service.from('rulebooks').select('id,realm_id,name,storage_path,page_count,file_size,status,error_message,created_at').eq('realm_id', realmId).order('created_at'),
  ]);

  if (!realm || !membership) notFound();
  if (membership.role !== 'narrator') redirect(`/app/realm/${realmId}`);

  return (
    <RealmSettings
      realm={realm}
      members={members ?? []}
      currentUserId={user.id}
      rulebooks={(rulebooks as Rulebook[]) ?? []}
    />
  );
}
