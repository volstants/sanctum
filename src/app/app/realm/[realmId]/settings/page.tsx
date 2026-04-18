import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { RealmSettings } from '@/components/layout/RealmSettings';

interface Props {
  params: Promise<{ realmId: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { realmId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [{ data: realm }, { data: members }, { data: membership }] = await Promise.all([
    supabase.from('realms').select('*').eq('id', realmId).single(),
    supabase.from('realm_members').select('*').eq('realm_id', realmId),
    supabase.from('realm_members').select('role').eq('realm_id', realmId).eq('user_id', user.id).single(),
  ]);

  if (!realm || !membership) notFound();
  if (membership.role !== 'narrator') redirect(`/app/realm/${realmId}`);

  return (
    <RealmSettings
      realm={realm}
      members={members ?? []}
      currentUserId={user.id}
    />
  );
}
