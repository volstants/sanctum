'use client';

import type { Channel, Message } from '@/types';
import { ChatView } from '@/components/chat/ChatView';
import { Map, Sparkles, Mic } from 'lucide-react';

const COMING_SOON: Record<string, { icon: React.ElementType; label: string; phase: string }> = {
  vtt:   { icon: Map,      label: 'VTT Canvas',   phase: 'Phase 3' },
  ai:    { icon: Sparkles, label: 'AI Co-Master',  phase: 'Phase 4' },
  voice: { icon: Mic,      label: 'Voice Chat',   phase: 'Phase 5' },
};

interface Props {
  channel: Channel;
  realmId: string;
  userId: string;
  isNarrator: boolean;
  displayName: string;
  initialMessages?: Message[];
}

export function ChannelView({ channel, userId, isNarrator, initialMessages = [] }: Props) {
  if (channel.type === 'chat') {
    return (
      <ChatView
        channelId={channel.id}
        channelName={channel.name}
        userId={userId}
        isNarrator={isNarrator}
        initialMessages={initialMessages}
      />
    );
  }

  const placeholder = COMING_SOON[channel.type];
  if (!placeholder) return null;
  const Icon = placeholder.icon;

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center px-4 border-b border-[var(--border)] flex-shrink-0">
        <span className="font-semibold text-[var(--text-primary)] text-sm"># {channel.name}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
        <Icon className="w-12 h-12 text-[var(--text-muted)]" />
        <p className="text-[var(--text-primary)] font-semibold">{placeholder.label}</p>
        <p className="text-xs text-[var(--text-muted)]">Coming in {placeholder.phase}</p>
      </div>
    </div>
  );
}
