'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/appStore';
import type { Realm } from '@/types';

export function useRealtimeRealms(userId: string, initialRealms: Realm[]) {
  const { setRealms } = useAppStore();

  useEffect(() => {
    setRealms(initialRealms);
  }, [initialRealms, setRealms]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    // Re-fetch realms when realm_members changes (join/leave/kick)
    const channel = supabase
      .channel(`realms:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realm_members',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const { data } = await supabase
            .from('realms')
            .select('*')
            .in(
              'id',
              (await supabase.from('realm_members').select('realm_id').eq('user_id', userId)).data?.map(
                (r) => r.realm_id
              ) ?? []
            )
            .order('created_at');
          if (data) setRealms(data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, setRealms]);
}
