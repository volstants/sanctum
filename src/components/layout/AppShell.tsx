'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { RealmList } from './RealmList';
import type { Profile, Realm } from '@/types';
import { useParams } from 'next/navigation';

interface Props {
  profile: Profile | null;
  realms: Realm[];
  children: React.ReactNode;
}

export function AppShell({ profile, realms, children }: Props) {
  const { setProfile, setRealms, setActiveRealm, setActiveChannel } = useAppStore();
  const params = useParams();

  // Hydrate global store from server-fetched data
  useEffect(() => {
    setProfile(profile);
    setRealms(realms);
  }, [profile, realms, setProfile, setRealms]);

  useEffect(() => {
    setActiveRealm((params?.realmId as string) ?? null);
    setActiveChannel((params?.channelId as string) ?? null);
  }, [params, setActiveRealm, setActiveChannel]);

  const activeRealmId = (params?.realmId as string) ?? null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Column 1: Realm list (72px) */}
      <RealmList realms={realms} activeRealmId={activeRealmId} />

      {/* Column 2+3: Realm content (fills rest) */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
