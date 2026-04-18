'use client';

import { useState, useRef, useCallback } from 'react';

export interface VoiceSegment {
  text: string;
  timestamp: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

export function useVoiceTranscript(lang = 'pt-BR') {
  const [isListening, setIsListening] = useState(false);
  const [segments, setSegments] = useState<VoiceSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false); // true = user wants it running

  const isSupported = !!getSR();

  const createAndStart = useCallback((SR: SpeechRecognitionCtor) => {
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang;

    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) {
        const text = last[0].transcript.trim();
        if (text) setSegments((prev) => [...prev, { text, timestamp: new Date().toISOString() }]);
      }
    };

    rec.onerror = (e) => {
      // 'no-speech' and 'audio-capture' are transient — don't surface as fatal
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(e.error);
        activeRef.current = false;
        setIsListening(false);
      }
    };

    rec.onend = () => {
      // Auto-restart if user hasn't manually stopped
      if (activeRef.current) {
        try {
          const newRec = createAndStart(SR);
          recRef.current = newRec;
        } catch {
          activeRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    rec.start();
    return rec;
  }, [lang]);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) return;
    setError(null);
    activeRef.current = true;
    recRef.current = createAndStart(SR);
    setIsListening(true);
  }, [createAndStart]);

  const stop = useCallback(() => {
    activeRef.current = false;
    recRef.current?.stop();
    recRef.current = null;
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (activeRef.current) stop();
    else start();
  }, [start, stop]);

  const clear = useCallback(() => setSegments([]), []);

  const fullText = segments.map((s) => s.text).join(' ');

  return { isListening, segments, fullText, isSupported, error, start, stop, toggle, clear };
}
