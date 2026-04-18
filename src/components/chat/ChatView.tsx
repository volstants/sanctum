'use client';

import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useAppStore } from '@/stores/appStore';
import { Loader2 } from 'lucide-react';

interface Props {
  channelId: string;
  channelName: string;
  userId: string;
  isNarrator: boolean;
}

export function ChatView({ channelId, channelName, userId, isNarrator }: Props) {
  const { messages, loading } = useRealtimeMessages(channelId);
  const activeSessionId = useAppStore((s) => s.activeSessionId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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

      {/* Messages */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
        </div>
      ) : (
        <MessageList messages={messages} currentUserId={userId} />
      )}

      {/* Input */}
      <ChatInput
        channelId={channelId}
        userId={userId}
        isNarrator={isNarrator}
      />
    </div>
  );
}
