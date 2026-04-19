'use client';

import { useState, useRef, useCallback } from 'react';

export interface AudioChunk {
  id: string;
  blob: Blob;
  mimeType: string;
  startedAt: string;
  durationSec: number;
}

const CHUNK_INTERVAL_MS = 60_000; // 60s — Groq Whisper funciona melhor com chunks maiores

export function useAudioChunks(onChunk: (chunk: AudioChunk) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkStartRef = useRef<string>('');
  const chunkIdRef = useRef(0);
  const activeRef = useRef(false);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? 'audio/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 24_000,
      });

      const startChunk = () => {
        chunkStartRef.current = new Date().toISOString();
        recorder.start(CHUNK_INTERVAL_MS);
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size < 512) return;
        const chunk: AudioChunk = {
          id: `chunk-${++chunkIdRef.current}`,
          blob: e.data,
          mimeType,
          startedAt: chunkStartRef.current,
          durationSec: CHUNK_INTERVAL_MS / 1000,
        };
        setTotalChunks((n) => n + 1);
        chunkStartRef.current = new Date().toISOString();
        onChunk(chunk);
      };

      recorder.onerror = () => {
        setError('Erro no gravador de áudio');
        activeRef.current = false;
        setIsRecording(false);
      };

      // Se a track de microfone cair, reinicia automaticamente
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (activeRef.current) {
            recorderRef.current = null;
            streamRef.current = null;
            setTimeout(() => { if (activeRef.current) start(); }, 500);
          }
        };
      });

      recorderRef.current = recorder;
      activeRef.current = true;
      startChunk();
      setIsRecording(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('Permission') || msg.includes('NotAllowed')
        ? 'Permissão de microfone negada'
        : msg);
    }
  }, [onChunk]);

  const stop = useCallback(() => {
    activeRef.current = false;
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    setIsRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (isRecording) stop();
    else start();
  }, [isRecording, start, stop]);

  return { isRecording, error, totalChunks, start, stop, toggle };
}