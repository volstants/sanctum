'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchMessages } from '@/lib/actions/messages';
import type { Message } from '@/types';

const POLL_INTERVAL = 2500;

export function useRealtimeMessages(channelId: string, initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const lastTimestampRef = useRef<string | undefined>(
    initialMessages.at(-1)?.created_at
  );

  useEffect(() => {
    setTimeout(() => {
      setMessages(initialMessages);
      lastTimestampRef.current = initialMessages.at(-1)?.created_at;
    }, 0);
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    const poll = async () => {
      const newMsgs = await fetchMessages(channelId, lastTimestampRef.current);
      if (newMsgs.length > 0) {
        lastTimestampRef.current = newMsgs.at(-1)?.created_at;
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...newMsgs.filter((m) => !ids.has(m.id))];
        });
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [channelId]);

  return { messages, loading: false };
}
