'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useRealtimeRealms } from '@/hooks/useRealtimeRealms';
import { RealmList } from './RealmList';
import type { Profile, Realm } from '@/types';
import { useParams } from 'next/navigation';

interface Props {
  profile: Profile | null;
  realms: Realm[];
  userId: string;
  children: React.ReactNode;
}

export function AppShell({ profile, realms, userId, children }: Props) {
  const { setProfile, setActiveRealm, setActiveChannel } = useAppStore();
  const storeRealms = useAppStore((s) => s.realms);
  const params = useParams();

  useRealtimeRealms(userId, realms);

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  useEffect(() => {
    setActiveRealm((params?.realmId as string) ?? null);
    setActiveChannel((params?.channelId as string) ?? null);
  }, [params, setActiveRealm, setActiveChannel]);

  const activeRealmId = (params?.realmId as string) ?? null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <RealmList realms={storeRealms} activeRealmId={activeRealmId} />
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
