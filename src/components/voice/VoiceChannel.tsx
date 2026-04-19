'use client';

import { useState } from 'react';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Radio } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAmbientTTS } from '@/hooks/useAmbientTTS';
import type { VoiceParticipant } from '@/hooks/useWebRTC';
import { AMBIENT_PRESETS } from '@/lib/ambient-sounds';

interface Props {
  channelId: string;
  realmId: string;
  channelName: string;
  userId: string;
  displayName: string;
  isNarrator: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function ParticipantTile({ participant, isLocal }: { participant: VoiceParticipant; isLocal: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* Speaking pulse ring — always shown (no VAD) */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: 'var(--brand)' }}
        />
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold select-none"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid var(--brand)', color: 'var(--text-primary)' }}
        >
          {getInitials(participant.name)}
        </div>
        {participant.isMuted && (
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#ef4444', border: '2px solid var(--bg-primary)' }}
          >
            <MicOff className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
          {participant.name}
        </p>
        {isLocal && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>(você)</p>
        )}
      </div>
    </div>
  );
}

export function VoiceChannel({ channelId, realmId, channelName, userId, displayName, isNarrator }: Props) {
  const { participants, isJoined, isMuted, error, join, leave, toggleMute } = useWebRTC({
    channelId,
    userId,
    displayName,
  });

  const { broadcastAmbient, broadcastStop, broadcastTTS, isPlaying, currentUrl } = useAmbientTTS({ realmId });

  const [narratorOpen, setNarratorOpen] = useState(false);
  const [ambientUrl, setAmbientUrl] = useState('');
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  const [ttsText, setTtsText] = useState('');

  const localFirst = [
    ...participants.filter((p) => p.userId === userId),
    ...participants.filter((p) => p.userId !== userId),
  ];

  if (!isJoined) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <Mic className="w-8 h-8" style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              {channelName}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Canal de voz
            </p>
          </div>
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 w-full">
              {error}
            </p>
          )}
          <button
            onClick={join}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand)', color: '#fff' }}
          >
            Entrar no canal de voz
          </button>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            O navegador solicitará permissão para usar o microfone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="h-12 flex items-center justify-between px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4" style={{ color: 'var(--brand)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {channelName}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          >
            {participants.length}
          </span>
        </div>
        <button
          onClick={leave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#ef4444', color: '#fff' }}
        >
          <PhoneOff className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>

      {/* Participant grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs text-center">
            {error}
          </div>
        )}
        {localFirst.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhum participante ainda
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center">
            {localFirst.map((p) => (
              <ParticipantTile key={p.userId} participant={p} isLocal={p.userId === userId} />
            ))}
          </div>
        )}
      </div>

      {/* Narrator section */}
      {isNarrator && (
        <div
          className="flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setNarratorOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>Controles do Narrador</span>
            <span style={{ color: 'var(--text-muted)' }}>{narratorOpen ? '▲' : '▼'}</span>
          </button>

          {narratorOpen && (
            <div
              className="px-4 pb-4 flex flex-col gap-4"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Ambient audio */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Áudio Ambiente
                </p>

                {/* Preset grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {AMBIENT_PRESETS.map((p) => {
                    const active = currentUrl === `preset:${p.id}`;
                    return (
                      <button
                        key={p.id}
                        onClick={() => broadcastAmbient(`preset:${p.id}`, ambientVolume)}
                        className="flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-semibold transition-all hover:opacity-90"
                        style={{
                          backgroundColor: active ? 'var(--brand)' : 'var(--bg-primary)',
                          border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                          color: active ? '#000' : 'var(--text-secondary)',
                        }}
                      >
                        <span className="text-base leading-none">{p.emoji}</span>
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom URL */}
                <input
                  type="text"
                  placeholder="Ou cole URL do áudio (mp3, ogg…)"
                  value={ambientUrl}
                  onChange={(e) => setAmbientUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <div className="flex items-center gap-2">
                  <VolumeX className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={ambientVolume}
                    onChange={(e) => setAmbientVolume(Number(e.target.value))}
                    className="flex-1 accent-[var(--brand)]"
                  />
                  <Volume2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (ambientUrl.trim()) broadcastAmbient(ambientUrl.trim(), ambientVolume); }}
                    disabled={!ambientUrl.trim()}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: 'var(--brand)', color: '#000' }}
                  >
                    {isPlaying && ambientUrl.trim() ? 'Trocar URL' : 'Tocar URL'}
                  </button>
                  <button
                    onClick={broadcastStop}
                    disabled={!isPlaying}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    Parar tudo
                  </button>
                </div>
                {currentUrl && (
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    ▶ {currentUrl.startsWith('preset:')
                      ? AMBIENT_PRESETS.find(p => `preset:${p.id}` === currentUrl)?.label ?? currentUrl
                      : currentUrl}
                  </p>
                )}
              </div>

              {/* TTS */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Narração por Voz (TTS)
                </p>
                <textarea
                  rows={3}
                  placeholder="Texto para narrar para todos os jogadores…"
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={() => { if (ttsText.trim()) { broadcastTTS(ttsText.trim()); setTtsText(''); } }}
                  disabled={!ttsText.trim()}
                  className="py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--brand)', color: '#fff' }}
                >
                  Narrar para todos
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mic toggle */}
      <div
        className="flex-shrink-0 flex items-center justify-center py-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={toggleMute}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{ backgroundColor: isMuted ? '#ef4444' : 'var(--bg-secondary)', border: '2px solid var(--border)' }}
          title={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
          )}
        </button>
      </div>
    </div>
  );
}
