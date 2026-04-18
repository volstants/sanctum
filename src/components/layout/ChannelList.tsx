'use client';

import type { Channel, Realm, RealmMember } from '@/types';
import { Hash, Map, Mic, Sparkles, Settings, LogOut, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  chat:  Hash,
  vtt:   Map,
  voice: Mic,
  ai:    Sparkles,
};

const CHANNEL_COLORS: Record<string, string> = {
  chat:  'var(--channel-chat)',
  vtt:   'var(--channel-vtt)',
  ai:    'var(--channel-ai)',
  voice: 'var(--channel-voice)',
};

interface Props {
  realm: Realm;
  channels: Channel[];
  members: RealmMember[];
  activeChannelId: string | null;
  currentUserId: string;
  isNarrator: boolean;
}

export function ChannelList({ realm, channels, members, activeChannelId, currentUserId, isNarrator }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-[var(--bg-secondary)] flex flex-col">
      {/* Realm header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shadow-sm">
        <h2 className="font-bold text-[var(--text-primary)] truncate text-sm">{realm.name}</h2>
        {isNarrator && (
          <button
            onClick={() => router.push(`/app/realm/${realm.id}/settings`)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Channels
        </p>
        {channels.filter((ch) => ch.type !== 'ai').map((ch) => {
          const Icon = CHANNEL_ICONS[ch.type] ?? Hash;
          const color = CHANNEL_COLORS[ch.type] ?? 'var(--channel-chat)';
          const isActive = ch.id === activeChannelId;

          return (
            <button
              key={ch.id}
              onClick={() => router.push(`/app/realm/${realm.id}/channel/${ch.id}`)}
              className={`
                w-full flex items-center gap-2 px-2 py-[6px] rounded-md text-sm transition-all
                ${isActive
                  ? 'bg-[var(--bg-modifier-selected)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-modifier-hover)] hover:text-[var(--text-secondary)]'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
              <span className="truncate">{ch.name}</span>
            </button>
          );
        })}

        {/* Members */}
        <p className="px-2 py-1 mt-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Members — {members.length}
        </p>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-2 px-2 py-[5px]">
            <div className="relative">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.display_name} className="w-7 h-7 rounded-full" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--brand-dim)] flex items-center justify-center text-[var(--brand)] text-xs font-bold">
                  {m.display_name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{m.display_name}</span>
            {m.role === 'narrator' && (
              <span title="Narrator"><Crown className="w-3 h-3 text-[var(--brand)] flex-shrink-0" /></span>
            )}
          </div>
        ))}
      </div>

      {/* User bar */}
      <div className="px-2 py-2 border-t border-[var(--border)] bg-[var(--bg-floating)] flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[var(--brand-dim)] flex items-center justify-center text-[var(--brand)] text-xs font-bold flex-shrink-0">
          {isNarrator ? <Crown className="w-4 h-4" /> : '?'}
        </div>
        <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">
          {isNarrator ? 'Narrator' : 'Player'}
        </span>
        <button
          onClick={handleSignOut}
          className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
