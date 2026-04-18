'use client';

import type { Channel } from '@/types';

// These will be filled in Phase 2 (chat) and Phase 3 (canvas)
const PLACEHOLDER: Record<string, string> = {
  chat:  'Chat channel — Phase 2',
  vtt:   'VTT Canvas — Phase 3',
  ai:    'AI Co-Master — Phase 4',
  voice: 'Voice Chat — Phase 5',
};

interface Props {
  channel: Channel;
  realmId: string;
  userId: string;
  isNarrator: boolean;
  displayName: string;
}

export function ChannelView({ channel }: Props) {
  return (
    <div className="h-full flex flex-col">
      {/* Channel header */}
      <div className="h-12 flex items-center px-4 border-b border-[var(--border)] shadow-sm flex-shrink-0">
        <span className="font-semibold text-[var(--text-primary)] text-sm"># {channel.name}</span>
        <span className="ml-3 text-xs text-[var(--text-muted)] font-mono uppercase tracking-wider">
          {channel.type}
        </span>
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
        {PLACEHOLDER[channel.type] ?? 'Coming soon'}
      </div>
    </div>
  );
}
