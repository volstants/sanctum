'use client';

import { useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseDiceCommand, isDiceCommand } from '@/lib/dice';
import { Send, Dices } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  channelId: string;
  userId: string;
  isNarrator: boolean;
  onMessageSent?: (content: string) => void;
}

export function ChatInput({ channelId, userId, isNarrator, onMessageSent }: Props) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  const isDice = isDiceCommand(value);

  const send = useCallback(async () => {
    const content = value.trim();
    if (!content || sending) return;

    setSending(true);
    setValue('');

    let messageContent = content;
    let metadata: Record<string, unknown> = {};

    if (isDiceCommand(content)) {
      const result = parseDiceCommand(content);
      if (result) {
        messageContent = result.notation;
        metadata = { type: 'dice', expression: result.expression, rolls: result.rolls, total: result.total };
      }
    }

    await supabase.from('messages').insert({
      channel_id: channelId,
      user_id: userId,
      content: messageContent,
      is_narrator: isNarrator,
      metadata: Object.keys(metadata).length ? metadata : null,
    });

    onMessageSent?.(messageContent);
    setSending(false);
    textareaRef.current?.focus();
  }, [value, sending, channelId, userId, isNarrator, onMessageSent, supabase]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div className={`flex items-end gap-2 bg-[var(--bg-floating)] rounded-xl border transition-colors ${
        isDice ? 'border-[var(--brand)]/50' : 'border-[var(--border-strong)]'
      }`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isNarrator ? 'Narrate… (Shift+Enter for new line)' : 'Message… or /roll 2d20+5'}
          rows={1}
          className="flex-1 bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none max-h-40 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
          }}
        />

        <div className="flex items-center gap-1 pr-2 pb-2">
          <AnimatePresence>
            {isDice && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-[var(--brand)] px-2"
              >
                <Dices className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={send}
            disabled={!value.trim() || sending}
            className="p-2 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-[var(--text-muted)] mt-1.5 px-1">
        Enter to send · Shift+Enter for new line · <span className="font-mono">/roll NdN+M</span> for dice
      </p>
    </div>
  );
}
