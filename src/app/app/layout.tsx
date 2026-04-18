import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Fetch user's profile and realms
  const [{ data: profile }, { data: realms }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('realms')
      .select('*')
      .in('id',
        supabase.from('realm_members').select('realm_id').eq('user_id', user.id)
      )
      .order('created_at'),
  ]);

  return (
    <AppShell profile={profile} realms={realms ?? []}>
      {children}
    </AppShell>
  );
}
