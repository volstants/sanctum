'use client';

import { useState, useEffect, useCallback } from 'react';

export type VoiceMode = 'speech' | 'audio';

const KEY = (realmId: string) => `sanctum:voice-mode:${realmId}`;

export function useVoiceMode(realmId: string) {
  const [mode, setModeState] = useState<VoiceMode>('speech');

  useEffect(() => {
    const stored = localStorage.getItem(KEY(realmId));
    if (stored === 'audio' || stored === 'speech') setModeState(stored);
  }, [realmId]);

  const setMode = useCallback((m: VoiceMode) => {
    localStorage.setItem(KEY(realmId), m);
    setModeState(m);
  }, [realmId]);

  return { mode, setMode };
}
