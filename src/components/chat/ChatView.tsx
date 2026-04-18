'use client';

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useAppStore } from '@/stores/appStore';
import type { Message } from '@/types';

interface Props {
  channelId: string;
  channelName: string;
  userId: string;
  isNarrator: boolean;
  initialMessages: Message[];
}

export function ChatView({ channelId, channelName, userId, isNarrator, initialMessages }: Props) {
  const { messages } = useRealtimeMessages(channelId, initialMessages);
  const activeSessionId = useAppStore((s) => s.activeSessionId);

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--border)] flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)]">#</span>
          <span className="font-semibold text-[var(--text-primary)] text-sm">{channelName}</span>
        </div>
        {activeSessionId && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--danger)] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse" />
            Recording
          </div>
        )}
      </div>

      <MessageList messages={messages} currentUserId={userId} />

      <ChatInput
        channelId={channelId}
        userId={userId}
        isNarrator={isNarrator}
      />
    </div>
  );
}
