'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface VoiceParticipant {
  userId: string;
  name: string;
  isMuted: boolean;
}

interface UseWebRTCOptions {
  channelId: string;
  userId: string;
  displayName: string;
}

interface PeerEntry {
  peer: import('simple-peer').Instance;
  userId: string;
}

export function useWebRTC({ channelId, userId, displayName }: UseWebRTCOptions) {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const addParticipant = useCallback((p: VoiceParticipant) => {
    setParticipants((prev) => {
      if (prev.find((x) => x.userId === p.userId)) return prev;
      return [...prev, p];
    });
  }, []);

  const removeParticipant = useCallback((uid: string) => {
    setParticipants((prev) => prev.filter((x) => x.userId !== uid));
  }, []);

  const updateMute = useCallback((uid: string, muted: boolean) => {
    setParticipants((prev) =>
      prev.map((x) => (x.userId === uid ? { ...x, isMuted: muted } : x))
    );
  }, []);

  const destroyPeer = useCallback((uid: string) => {
    const entry = peersRef.current.get(uid);
    if (entry) {
      try { entry.peer.destroy(); } catch { /* ignore */ }
      peersRef.current.delete(uid);
    }
    const audio = audioElementsRef.current.get(uid);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audioElementsRef.current.delete(uid);
    }
  }, []);

  const createPeer = useCallback(
    async (targetUserId: string, initiator: boolean, incomingSignal?: unknown) => {
      if (peersRef.current.has(targetUserId)) return;
      if (!streamRef.current) return;

      const SimplePeer = (await import('simple-peer')).default;

      const peer = new SimplePeer({
        initiator,
        stream: streamRef.current,
        trickle: true,
      });

      peersRef.current.set(targetUserId, { peer, userId: targetUserId });

      peer.on('signal', (signalData: unknown) => {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'voice:signal',
          payload: { from: userId, to: targetUserId, signal: signalData },
        });
      });

      peer.on('stream', (remoteStream: MediaStream) => {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.play().catch(() => { /* autoplay blocked */ });
        audioElementsRef.current.set(targetUserId, audio);
      });

      peer.on('error', () => {
        destroyPeer(targetUserId);
        removeParticipant(targetUserId);
      });

      peer.on('close', () => {
        destroyPeer(targetUserId);
      });

      if (!initiator && incomingSignal) {
        peer.signal(incomingSignal as Parameters<typeof peer.signal>[0]);
      }
    },
    [userId, destroyPeer, removeParticipant]
  );

  const join = useCallback(async () => {
    if (isJoined) return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setError('Permissão de microfone negada. Verifique as configurações do navegador.');
      return;
    }

    streamRef.current = stream;

    const supabase = createClient();
    const ch = supabase.channel(`voice:${channelId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = ch;

    ch.on('broadcast', { event: 'voice:join' }, async ({ payload }) => {
      const { userId: joinerId, name } = payload as { userId: string; name: string };
      if (joinerId === userId) return;
      addParticipant({ userId: joinerId, name, isMuted: false });
      await createPeer(joinerId, true, undefined);
    });

    ch.on('broadcast', { event: 'voice:leave' }, ({ payload }) => {
      const { userId: leaverId } = payload as { userId: string };
      destroyPeer(leaverId);
      removeParticipant(leaverId);
    });

    ch.on('broadcast', { event: 'voice:signal' }, async ({ payload }) => {
      const { from, to, signal } = payload as { from: string; to: string; signal: unknown };
      if (to !== userId) return;
      if (!peersRef.current.has(from)) {
        await createPeer(from, false, signal);
      } else {
        const entry = peersRef.current.get(from);
        if (entry) {
          try {
            entry.peer.signal(signal as Parameters<typeof entry.peer.signal>[0]);
          } catch { /* ignore stale signals */ }
        }
      }
    });

    ch.on('broadcast', { event: 'voice:mute' }, ({ payload }) => {
      const { userId: muterId, isMuted: muted } = payload as { userId: string; isMuted: boolean };
      updateMute(muterId, muted);
    });

    await ch.subscribe();

    // Announce our presence
    ch.send({
      type: 'broadcast',
      event: 'voice:join',
      payload: { userId, name: displayName },
    });

    addParticipant({ userId, name: displayName, isMuted: false });
    setIsJoined(true);
  }, [isJoined, channelId, userId, displayName, addParticipant, createPeer, destroyPeer, removeParticipant, updateMute]);

  const leave = useCallback(() => {
    if (!isJoined) return;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'voice:leave',
      payload: { userId },
    });

    channelRef.current?.unsubscribe();
    channelRef.current = null;

    // Destroy all peers
    peersRef.current.forEach((_, uid) => destroyPeer(uid));
    peersRef.current.clear();

    // Stop mic tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setParticipants([]);
    setIsJoined(false);
    setIsMuted(false);
  }, [isJoined, userId, destroyPeer]);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const newMuted = !isMuted;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !newMuted;
    });
    setIsMuted(newMuted);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'voice:mute',
      payload: { userId, isMuted: newMuted },
    });
    updateMute(userId, newMuted);
  }, [isMuted, userId, updateMute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'voice:leave',
          payload: { userId },
        });
        channelRef.current?.unsubscribe();
        peersRef.current.forEach((_, uid) => destroyPeer(uid));
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { participants, isJoined, isMuted, error, join, leave, toggleMute };
}
