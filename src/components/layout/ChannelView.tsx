'use client';

import dynamic from 'next/dynamic';
import type { Channel, Message } from '@/types';
import { ChatView } from '@/components/chat/ChatView';
import { Mic, BrainCircuit, ChevronRight } from 'lucide-react';

const VTTCanvas = dynamic(() => import('@/components/canvas/VTTCanvas').then((m) => m.VTTCanvas), { ssr: false });

interface Props {
  channel: Channel;
  realmId: string;
  userId: string;
  isNarrator: boolean;
  displayName: string;
  realmSystem: string | null;
  initialMessages?: Message[];
}

export function ChannelView({ channel, realmId, userId, isNarrator, displayName, realmSystem, initialMessages = [] }: Props) {
  if (channel.type === 'chat') {
    return (
      <ChatView
        channelId={channel.id}
        channelName={channel.name}
        realmId={realmId}
        userId={userId}
        isNarrator={isNarrator}
        initialMessages={initialMessages}
      />
    );
  }

  if (channel.type === 'vtt') {
    return (
      <VTTCanvas
        channelId={channel.id}
        channelName={channel.name}
        realmId={realmId}
        isNarrator={isNarrator}
      />
    );
  }

  if (channel.type === 'ai') {
    return (
      <div className="h-full flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-[var(--border)] flex-shrink-0">
          <span className="font-semibold text-[var(--text-primary)] text-sm"># {channel.name}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <BrainCircuit className="w-10 h-10 text-[var(--brand)]" />
          <p className="text-[var(--text-primary)] font-semibold">Co-Mestre de IA</p>
          <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
            O Co-Mestre está disponível na barra lateral direita, sempre visível durante a sessão.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[var(--brand)] font-semibold">
            Use o painel <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    );
  }

  if (channel.type === 'voice') {
    return (
      <div className="h-full flex flex-col">
        <div className="h-12 flex items-center px-4 border-b border-[var(--border)] flex-shrink-0">
          <span className="font-semibold text-[var(--text-primary)] text-sm"># {channel.name}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <Mic className="w-12 h-12 text-[var(--text-muted)]" />
          <p className="text-[var(--text-primary)] font-semibold">Voice Chat</p>
          <p className="text-xs text-[var(--text-muted)]">Em breve — Fase 5</p>
        </div>
      </div>
    );
  }

  return null;
}
