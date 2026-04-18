'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { analyzeSession } from '@/lib/actions/ai';
import type { Message } from '@/types';

const TRIGGER_EVERY_N = 5;      // new messages between analyses
const COOLDOWN_MS = 2 * 60_000; // min 2 min between calls

export function useCoMasterAnalysis(
  realmId: string,
  isNarrator: boolean,
  messages: Message[],
) {
  const { addSuggestion, setCoMasterThinking, setChannelMessages } = useAppStore();
  const lastAnalyzedCount = useRef(0);
  const lastAnalyzedAt = useRef(0);
  const analyzing = useRef(false);

  // Keep store in sync so CoMasterPanel can access messages for diary
  useEffect(() => {
    setChannelMessages(messages);
  }, [messages, setChannelMessages]);

  // Only narrators get proactive analysis
  useEffect(() => {
    if (!isNarrator) return;
    if (analyzing.current) return;

    const newCount = messages.length - lastAnalyzedCount.current;
    const cooldownPassed = Date.now() - lastAnalyzedAt.current > COOLDOWN_MS;

    if (newCount < TRIGGER_EVERY_N || !cooldownPassed) return;

    const run = async () => {
      analyzing.current = true;
      setCoMasterThinking(true);

      try {
        const recent = messages.slice(-20).map((m) => ({
          sender: m.profiles?.display_name ?? (m.is_narrator ? 'Narrator' : 'Player'),
          content: m.content,
        }));

        const suggestions = await analyzeSession(realmId, recent);

        for (const s of suggestions) {
          addSuggestion({
            id: `${Date.now()}-${Math.random()}`,
            title: s.title,
            description: s.description,
            mechanic: s.mechanic || null,
            type: s.type as never,
            timestamp: new Date(),
          });
        }

        lastAnalyzedCount.current = messages.length;
        lastAnalyzedAt.current = Date.now();
      } catch {
        // Silent fail — proactive analysis is best-effort
      } finally {
        analyzing.current = false;
        setCoMasterThinking(false);
      }
    };

    run();
  }, [messages.length, realmId, isNarrator, addSuggestion, setCoMasterThinking]);
}
