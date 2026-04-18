'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices } from 'lucide-react';

interface Props {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
        No messages yet. Start the adventure.
      </div>
    );
  }

  // Group consecutive messages from same user
  const grouped = messages.reduce<{ msg: Message; showHeader: boolean }[]>((acc, msg, i) => {
    const prev = messages[i - 1];
    const sameUser = prev?.user_id === msg.user_id && prev?.is_narrator === msg.is_narrator;
    const close = prev && new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
    acc.push({ msg, showHeader: !sameUser || !close });
    return acc;
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5">
      <AnimatePresence initial={false}>
        {grouped.map(({ msg, showHeader }) => (
          <MessageRow
            key={msg.id}
            message={msg}
            showHeader={showHeader}
            isOwn={msg.user_id === currentUserId}
          />
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

function MessageRow({ message, showHeader, isOwn }: {
  message: Message;
  showHeader: boolean;
  isOwn: boolean;
}) {
  const isDice = message.metadata?.type === 'dice';
  const isNarrator = message.is_narrator;
  const name = message.profiles?.display_name ?? 'Unknown';
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`group flex gap-3 px-2 py-0.5 rounded-md hover:bg-[var(--bg-modifier-hover)] ${showHeader ? 'mt-3' : ''}`}
    >
      {/* Avatar column */}
      <div className="w-10 flex-shrink-0 flex flex-col items-center pt-0.5">
        {showHeader ? (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
            ${isNarrator
              ? 'bg-[var(--brand-dim)] text-[var(--brand)] border border-[var(--brand)]/30'
              : 'bg-[var(--bg-floating)] text-[var(--text-secondary)]'
            }`}
          >
            {isNarrator ? '📖' : name.slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity mt-1.5">
            {time}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`text-sm font-semibold ${isNarrator ? 'text-[var(--brand)]' : isOwn ? 'text-white' : 'text-[var(--text-primary)]'}`}>
              {isNarrator ? '📖 Narrator' : name}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">{time}</span>
          </div>
        )}

        {isDice ? (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-floating)] rounded-lg px-3 py-2 w-fit border border-[var(--border)]">
            <Dices className="w-4 h-4 text-[var(--brand)] flex-shrink-0" />
            <div className="prose-sm prose-invert [&_strong]:text-[var(--brand)] [&_strong]:text-base">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className={`text-sm leading-relaxed prose-sm prose-invert [&_strong]:text-white [&_code]:bg-[var(--bg-floating)] [&_code]:px-1 [&_code]:rounded ${isNarrator ? 'text-[var(--text-primary)] italic' : 'text-[var(--text-secondary)]'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
