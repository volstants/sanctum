import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: memberships } = await supabase
    .from('realm_members')
    .select('realm_id')
    .eq('user_id', user.id);

  const realmIds = memberships?.map((m) => m.realm_id) ?? [];

  const [{ data: profile }, { data: realms }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    realmIds.length > 0
      ? supabase.from('realms').select('*').in('id', realmIds).order('created_at')
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AppShell profile={profile} realms={realms ?? []} userId={user.id}>
      {children}
    </AppShell>
  );
}
