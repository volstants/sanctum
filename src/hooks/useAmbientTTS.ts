'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseAmbientTTSOptions {
  realmId: string;
}

export function useAmbientTTS({ realmId }: UseAmbientTTSOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const stopAmbient = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentUrl(null);
  }, []);

  const playAmbient = useCallback((url: string, volume: number) => {
    stopAmbient();
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    audioRef.current = audio;
    audio.play().catch(() => { /* autoplay policy */ });
    setIsPlaying(true);
    setCurrentUrl(url);
  }, [stopAmbient]);

  const speakTTS = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  }, []);

  // Subscribe to ambient channel on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supabase = createClient();
    const ch = supabase.channel(`ambient:${realmId}`, {
      config: { broadcast: { self: true } },
    });

    channelRef.current = ch;

    ch.on('broadcast', { event: 'ambient:play' }, ({ payload }) => {
      const { url, volume } = payload as { url: string; volume: number };
      playAmbient(url, volume);
    });

    ch.on('broadcast', { event: 'ambient:stop' }, () => {
      stopAmbient();
    });

    ch.on('broadcast', { event: 'tts:speak' }, ({ payload }) => {
      const { text } = payload as { text: string };
      speakTTS(text);
    });

    ch.subscribe();

    return () => {
      stopAmbient();
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [realmId, playAmbient, stopAmbient, speakTTS]);

  const broadcastAmbient = useCallback((url: string, volume: number) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'ambient:play',
      payload: { url, volume },
    });
  }, []);

  const broadcastStop = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'ambient:stop',
      payload: {},
    });
  }, []);

  const broadcastTTS = useCallback((text: string) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'tts:speak',
      payload: { text },
    });
  }, []);

  return { broadcastAmbient, broadcastStop, broadcastTTS, isPlaying, currentUrl };
}
