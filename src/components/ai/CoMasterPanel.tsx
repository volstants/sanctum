'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

import {
  Sparkles, ArrowLeftRight, ScrollText, Loader2,
  ChevronDown, ChevronRight, Trash2, Mic, MicOff,
  Radio, BrainCircuit, AlertCircle, Bot,
} from 'lucide-react';
import { suggestAbilities, generateSessionDiary, convertStatBlock, transcribeAudioChunk, getProviderStatus, OPENROUTER_MODELS } from '@/lib/actions/ai';
import type { OpenRouterModelId, ProviderStatus } from '@/lib/actions/ai';
import { useAppStore } from '@/stores/appStore';
import { useAudioChunks, type AudioChunk } from '@/hooks/useAudioChunks';
import { useVoiceTranscript } from '@/hooks/useVoiceTranscript';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import type { AbilitySuggestion, SessionDiary, SystemConversion } from '@/lib/actions/ai';
import type { CoMasterSuggestion } from '@/types';

interface Props {
  realmId: string;
  realmSystem: string | null;
  isNarrator: boolean;
}

type Tab = 'live' | 'suggest' | 'diary' | 'convert';

const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
  { id: 'live',    icon: Radio,          label: 'Ao Vivo'   },
  { id: 'suggest', icon: Sparkles,       label: 'Skills'    },
  { id: 'diary',   icon: ScrollText,     label: 'Diário'    },
  { id: 'convert', icon: ArrowLeftRight, label: 'Converter' },
];

const TYPE_META: Record<string, { label: string; cls: string }> = {
  rule:      { label: 'Regra',      cls: 'bg-blue-900/50 text-blue-300 border-blue-700/50'       },
  npc:       { label: 'NPC',        cls: 'bg-purple-900/50 text-purple-300 border-purple-700/50' },
  plot:      { label: 'Trama',      cls: 'bg-green-900/50 text-green-300 border-green-700/50'    },
  encounter: { label: 'Encontro',   cls: 'bg-red-900/50 text-red-300 border-red-700/50'          },
  ability:   { label: 'Habilidade', cls: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
};

// ── Provider badge ────────────────────────────────────────────────────────────

function ProviderBanner({ providers }: { providers: ProviderStatus | null }) {
  if (!providers) return null;
  const missing: string[] = [];
  if (!providers.openRouter) missing.push('OPENROUTER_API_KEY');
  if (!providers.groq)       missing.push('GROQ_API_KEY');
  if (missing.length === 0)  return null;
  return (
    <div className="mx-2 mt-2 px-3 py-2 rounded-lg bg-yellow-950/40 border border-yellow-700/40 text-[10px] text-yellow-300 leading-relaxed flex-shrink-0">
      <strong>Funcionalidade limitada.</strong> Configure no <code>.env.local</code>:<br />
      {missing.map((k) => <span key={k} className="font-mono block">{k}=…</span>)}
    </div>
  );
}

// ── Model selector ────────────────────────────────────────────────────────────

function ModelSelector({ disabled }: { disabled?: boolean }) {
  const { selectedModel, setSelectedModel } = useAppStore();
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-[var(--border)] flex-shrink-0 ${disabled ? 'opacity-40' : ''}`}>
      <Bot className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value as OpenRouterModelId)}
        disabled={disabled}
        className="flex-1 text-[10px] bg-transparent text-[var(--text-secondary)] focus:outline-none cursor-pointer disabled:cursor-not-allowed"
      >
        {OPENROUTER_MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Root panel ────────────────────────────────────────────────────────────────

export function CoMasterPanel({ realmId, realmSystem, isNarrator }: Props) {
  const [tab, setTab] = useState<Tab>('live');
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  const { coMasterSuggestions, isCoMasterThinking, clearSuggestions, channelMessages } = useAppStore();

  useEffect(() => {
    getProviderStatus().then(setProviders);
  }, []);

  const chatMessages = channelMessages.map((m) => ({
    sender: m.profiles?.display_name ?? (m.is_narrator ? 'Narrador' : 'Jogador'),
    content: m.content,
    timestamp: m.created_at,
  }));

  const noOpenRouter = providers !== null && !providers.openRouter;

  return (
    <div className="h-full flex flex-col">
      {/* Provider warnings */}
      <ProviderBanner providers={providers} />

      {/* Model selector — disabled if no OpenRouter */}
      <ModelSelector disabled={noOpenRouter} />

      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)] flex-shrink-0">
        {TABS.map(({ id, icon: Icon, label }) => {
          const tabNeedsOR = id !== 'live';
          const tabDisabled = tabNeedsOR && noOpenRouter;
          return (
            <button
              key={id}
              onClick={() => !tabDisabled && setTab(id)}
              title={tabDisabled ? 'Requer OPENROUTER_API_KEY' : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold transition-colors border-b-2 ${
                tabDisabled
                  ? 'border-transparent text-[var(--text-muted)] opacity-35 cursor-not-allowed'
                  : tab === id
                    ? 'border-[var(--brand)] text-[var(--brand)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'live' && coMasterSuggestions.length > 0 && (
                <span className="absolute mt-0 w-3.5 h-3.5 bg-[var(--brand)] text-black text-[8px] font-bold rounded-full flex items-center justify-center -translate-y-4 translate-x-3">
                  {coMasterSuggestions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'live'    && (
          <LiveTab
            suggestions={coMasterSuggestions}
            thinking={isCoMasterThinking}
            onClear={clearSuggestions}
            isNarrator={isNarrator}
            realmId={realmId}
            chatMessages={chatMessages}
            providers={providers}
          />
        )}
        {tab === 'suggest' && <div className="flex-1 overflow-y-auto"><AbilitySuggestTab realmId={realmId} realmSystem={realmSystem} /></div>}
        {tab === 'diary'   && <div className="flex-1 overflow-y-auto"><DiaryTab realmId={realmId} chatMessages={chatMessages} /></div>}
        {tab === 'convert' && <div className="flex-1 overflow-y-auto"><ConvertTab realmId={realmId} realmSystem={realmSystem} /></div>}
      </div>
    </div>
  );
}

// ── Live tab ──────────────────────────────────────────────────────────────────

const SPEECH_TRIGGER_SEGMENTS = 6;
const SPEECH_COOLDOWN_MS = 90_000;

function LiveTab({
  suggestions, thinking, onClear, isNarrator, realmId, chatMessages, providers,
}: {
  suggestions: CoMasterSuggestion[];
  thinking: boolean;
  onClear: () => void;
  isNarrator: boolean;
  realmId: string;
  chatMessages: { sender: string; content: string; timestamp: string }[];
  providers: ProviderStatus | null;
}) {
  const { addSuggestion, setCoMasterThinking, members, selectedModel } = useAppStore();
  const { mode } = useVoiceMode(realmId);

  // Derived availability flags
  const hasGroq       = providers === null || providers.groq;       // null = still loading → optimistic
  const hasOpenRouter = providers === null || providers.openRouter;
  // If Groq unavailable and mode is audio, effective mode falls back to speech
  const effectiveMode = (!hasGroq && mode === 'audio') ? 'speech' : mode;

  // ── Speaker tagging ───────────────────────────────────────────────────────
  const [currentSpeaker, setCurrentSpeaker] = useState('Narrador');
  const currentSpeakerRef = useRef('Narrador');
  const [taggedSegments, setTaggedSegments] = useState<{ speaker: string; text: string; timestamp: string }[]>([]);
  const prevSegCountRef = useRef(0);
  const handleSpeakerChange = (name: string) => {
    setCurrentSpeaker(name);
    currentSpeakerRef.current = name;
  };
  const speakerNames = ['Narrador', ...members.map((m) => m.display_name.split(' ')[0])];

  // ── Audio chunk mode ──────────────────────────────────────────────────────
  const [processingChunk, setProcessingChunk] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [chunkLog, setChunkLog] = useState<{ id: string; preview: string; at: string }[]>([]);
  const transcriptRef = useRef('');

  const handleChunk = useCallback(async (chunk: AudioChunk) => {
    setProcessingChunk(true);
    setCoMasterThinking(true);
    try {
      const base64 = await blobToBase64(chunk.blob);
      const result = await transcribeAudioChunk(base64, chunk.mimeType, realmId, transcriptRef.current, selectedModel);
      if (result.transcript) {
        transcriptRef.current += ' ' + result.transcript;
        setChunkLog((prev) => [
          { id: chunk.id, preview: result.transcript.slice(0, 80), at: chunk.startedAt },
          ...prev.slice(0, 9),
        ]);
      }
      for (const s of result.suggestions) {
        addSuggestion({ id: `${Date.now()}-${Math.random()}`, title: s.title, description: s.description, mechanic: s.mechanic || null, type: s.type as never, timestamp: new Date() });
      }
    } catch (e) { setAudioError(String(e)); }
    finally { setProcessingChunk(false); setCoMasterThinking(false); }
  }, [realmId, selectedModel, addSuggestion, setCoMasterThinking]);

  const audio = useAudioChunks(handleChunk);

  // ── Speech API mode ───────────────────────────────────────────────────────
  const speech = useVoiceTranscript('pt-BR');

  useEffect(() => {
    const newCount = speech.segments.length - prevSegCountRef.current;
    if (newCount <= 0) return;
    const newSegs = speech.segments.slice(prevSegCountRef.current).map((s) => ({
      speaker: currentSpeakerRef.current,
      text: s.text,
      timestamp: s.timestamp,
    }));
    setTaggedSegments((prev) => [...prev, ...newSegs]);
    prevSegCountRef.current = speech.segments.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.segments.length]);

  const [speechLoading, setSpeechLoading] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const lastSpeechAnalyze = useRef(0);
  const lastSegmentCount = useRef(0);
  const analyzingRef = useRef(false);

  const runSpeechAnalysis = useCallback(async (segs: { speaker: string; text: string; timestamp: string }[]) => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setSpeechLoading(true);
    setSpeechError('');
    setCoMasterThinking(true);
    try {
      const { analyzeSession } = await import('@/lib/actions/ai');
      const voiceMsgs = segs.map((s) => ({ sender: s.speaker, content: s.text }));
      const chatMsgs = chatMessages.map((m) => ({ sender: m.sender, content: m.content }));
      const combined = [...chatMsgs, ...voiceMsgs].slice(-30);
      const result = await analyzeSession(realmId, combined, selectedModel);
      for (const s of result) {
        addSuggestion({ id: `${Date.now()}-${Math.random()}`, title: s.title, description: s.description, mechanic: s.mechanic || null, type: s.type as never, timestamp: new Date() });
      }
    } catch (e) { setSpeechError(String(e)); }
    finally { analyzingRef.current = false; setSpeechLoading(false); setCoMasterThinking(false); }
  }, [realmId, selectedModel, chatMessages, addSuggestion, setCoMasterThinking]);

  // Auto-trigger speech analysis
  useEffect(() => {
    if (effectiveMode !== 'speech' || !speech.isListening || !hasOpenRouter) return;
    const newSegs = taggedSegments.length - lastSegmentCount.current;
    const cooldownOk = Date.now() - lastSpeechAnalyze.current > SPEECH_COOLDOWN_MS;
    if (newSegs >= SPEECH_TRIGGER_SEGMENTS && cooldownOk) {
      lastSegmentCount.current = taggedSegments.length;
      lastSpeechAnalyze.current = Date.now();
      runSpeechAnalysis(taggedSegments);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taggedSegments.length, effectiveMode, hasOpenRouter]);

  const isListening  = effectiveMode === 'audio' ? audio.isRecording : speech.isListening;
  const toggleListen = effectiveMode === 'audio' ? audio.toggle : speech.toggle;
  const listenError  = effectiveMode === 'audio' ? audio.error : speech.error;
  const isProcessing = effectiveMode === 'audio' ? processingChunk : speechLoading;

  const handleClear = () => {
    transcriptRef.current = '';
    setChunkLog([]);
    setTaggedSegments([]);
    prevSegCountRef.current = 0;
    if (effectiveMode === 'speech') speech.clear();
  };

  const modelLabel = OPENROUTER_MODELS.find((m) => m.id === selectedModel)?.label ?? selectedModel;

  return (
    <div className="h-full flex flex-col">
      {/* Voice section */}
      {isNarrator && (
        <div className={`m-2 rounded-xl border p-3 flex flex-col gap-2 flex-shrink-0 transition-colors ${
          isListening ? 'border-red-500/60 bg-red-950/20' : 'border-[var(--border)] bg-[var(--bg-primary)]'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isListening
                ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                : <BrainCircuit className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {isListening ? (isProcessing ? 'Analisando…' : 'Ouvindo sessão…') : 'Co-Mestre auditivo'}
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">
                  {isListening
                    ? effectiveMode === 'audio'
                      ? `Groq Whisper → ${modelLabel} (chunks 60s)`
                      : `Speech API · auto a cada ${SPEECH_TRIGGER_SEGMENTS} falas · ${hasOpenRouter ? modelLabel : 'sem análise'}`
                    : effectiveMode === 'audio'
                      ? 'Modo: Groq Whisper + OpenRouter'
                      : hasOpenRouter ? 'Modo: Speech API + OpenRouter' : 'Modo: Speech API (análise desativada)'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(chunkLog.length > 0 || speech.segments.length > 0) && (
                <button onClick={handleClear} className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Limpar">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={toggleListen}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-black'
                }`}
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                {isListening ? 'Parar' : 'Ouvir'}
              </button>
            </div>
          </div>

          {(listenError || audioError || speechError) && (
            <div className="flex items-center gap-1.5 text-[10px] text-red-400">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {listenError || audioError || speechError}
            </div>
          )}

          {/* Speaker selector */}
          {effectiveMode === 'speech' && isListening && speakerNames.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[9px] text-[var(--text-muted)] self-center mr-0.5">Quem fala:</span>
              {speakerNames.map((name) => (
                <button
                  key={name}
                  onClick={() => handleSpeakerChange(name)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                    currentSpeaker === name
                      ? 'bg-[var(--brand)] text-black'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Speech transcript */}
          {effectiveMode === 'speech' && taggedSegments.length > 0 && (
            <div className="max-h-20 overflow-y-auto flex flex-col gap-0.5">
              {taggedSegments.slice(-6).map((s, i) => (
                <p key={i} className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  <span className="text-[var(--brand)] font-semibold">{s.speaker}:</span>
                  {' '}{s.text}
                </p>
              ))}
            </div>
          )}

          {/* Audio chunk log */}
          {effectiveMode === 'audio' && chunkLog.length > 0 && (
            <div className="max-h-24 overflow-y-auto flex flex-col gap-1.5">
              {chunkLog.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <span className="text-[9px] text-[var(--text-muted)] flex-shrink-0 mt-0.5">
                    {new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2">{c.preview}…</p>
                </div>
              ))}
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--brand)]">
              <Loader2 className="w-3 h-3 animate-spin" />
              {effectiveMode === 'audio' ? 'Transcrevendo (Whisper) e analisando…' : 'Analisando sessão…'}
            </div>
          )}

          {/* Groq unavailable warning when mode was set to audio */}
          {!hasGroq && mode === 'audio' && (
            <p className="text-[10px] text-yellow-400">
              Modo áudio requer GROQ_API_KEY — usando Speech API.
            </p>
          )}

          {/* Analisar agora — só Speech mode, só se OpenRouter disponível */}
          {effectiveMode === 'speech' && hasOpenRouter && (taggedSegments.length > 0 || chatMessages.length > 0) && (
            <button
              onClick={() => {
                lastSpeechAnalyze.current = Date.now();
                lastSegmentCount.current = taggedSegments.length;
                runSpeechAnalysis(taggedSegments);
              }}
              disabled={speechLoading}
              className="flex items-center justify-center gap-1.5 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-40 transition-colors"
            >
              {speechLoading
                ? <><Loader2 className="w-3 h-3 animate-spin text-[var(--brand)]" />Analisando…</>
                : <><Sparkles className="w-3 h-3 text-[var(--brand)]" />Analisar agora</>
              }
            </button>
          )}
        </div>
      )}

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 pt-1 pb-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
            {thinking ? (
              <><Loader2 className="w-3 h-3 animate-spin text-[var(--brand)]" /><span className="text-[var(--brand)]">Analisando sessão…</span></>
            ) : (
              <><Radio className="w-3 h-3" /><span>Atualiza a cada 5 mensagens</span></>
            )}
          </div>
          {suggestions.length > 0 && (
            <button onClick={onClear} className="text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Limpar">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="px-3 pb-3 flex flex-col gap-2 flex-1">
          {suggestions.length === 0 && !thinking && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-[var(--text-muted)]" />
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {!hasOpenRouter
                  ? 'Configure OPENROUTER_API_KEY para ativar sugestões proativas.'
                  : isNarrator
                    ? 'Sugestões aparecem automaticamente conforme a sessão avança, ou clique em "Analisar agora".'
                    : 'Apenas o narrador recebe sugestões proativas.'}
              </p>
            </div>
          )}

          {suggestions.map((s) => {
            const meta = TYPE_META[s.type] ?? { label: s.type, cls: 'bg-gray-700/50 text-gray-300 border-gray-600/50' };
            return (
              <div key={s.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase border flex-shrink-0 mt-0.5 ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{s.title}</p>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{s.description}</p>
                {s.mechanic && (
                  <p className="text-[10px] font-mono bg-[var(--bg-secondary)] rounded-md px-2 py-1.5 text-[var(--text-muted)] border border-[var(--border)]">
                    {s.mechanic}
                  </p>
                )}
                <p className="text-[9px] text-[var(--text-muted)]">
                  {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Ability Suggestions ────────────────────────────────────────────────────────

function AbilitySuggestTab({ realmId, realmSystem }: { realmId: string; realmSystem: string | null }) {
  const { selectedModel } = useAppStore();
  const [description, setDescription] = useState('');
  const [suggestions, setSuggestions] = useState<AbilitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    try {
      setSuggestions(await suggestAbilities(realmId, description, {}, selectedModel));
    } catch (e) { setError(String(e)); }
    setLoading(false);
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Descreva um personagem ou situação. A IA sugere habilidades com base exclusivamente nos seus rulebooks{realmSystem ? ` (${realmSystem})` : ''}.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ex: Um ladino humano especializado em venenos..."
        rows={4}
        className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] resize-none"
      />
      <button
        onClick={run}
        disabled={loading || !description.trim()}
        className="flex items-center justify-center gap-2 py-2.5 bg-[var(--brand)] text-black rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-[var(--brand)]/90 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Gerando…' : 'Sugerir Habilidades'}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {suggestions.map((s, i) => (
        <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-1.5">
          <p className="text-sm font-bold text-[var(--brand)]">{s.name}</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.description}</p>
          {s.mechanic && (
            <p className="text-[10px] text-[var(--text-muted)] font-mono bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md px-2 py-1.5">{s.mechanic}</p>
          )}
          <p className="text-[9px] text-[var(--text-muted)]">Fonte: {s.source}</p>
        </div>
      ))}
    </div>
  );
}

// ── Session Diary ─────────────────────────────────────────────────────────────

function DiaryTab({ realmId, chatMessages }: { realmId: string; chatMessages: { sender: string; content: string; timestamp: string }[] }) {
  const { selectedModel } = useAppStore();
  const [diary, setDiary] = useState<SessionDiary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      setDiary(await generateSessionDiary(realmId, chatMessages, undefined, selectedModel));
    } catch (e) { setError(String(e)); }
    setLoading(false);
  };

  const toggle = (k: string) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Gera um diário narrativo da sessão com base no log de chat ({chatMessages.length} mensagens).
      </p>
      <button
        onClick={run}
        disabled={loading || chatMessages.length === 0}
        className="flex items-center justify-center gap-2 py-2.5 bg-[var(--brand)] text-black rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-[var(--brand)]/90 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScrollText className="w-4 h-4" />}
        {loading ? 'Escrevendo…' : 'Gerar Diário'}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {chatMessages.length === 0 && !diary && (
        <p className="text-[11px] text-[var(--text-muted)]">Nenhuma mensagem no canal ainda.</p>
      )}

      {diary && (
        <div className="flex flex-col gap-3">
          <div className="bg-[var(--bg-primary)] border border-[var(--brand)]/30 rounded-xl p-4">
            <p className="text-sm font-bold text-[var(--brand)] mb-2">{diary.title}</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">{diary.summary}</p>
          </div>

          {diary.highlights?.length > 0 && (
            <CollapsibleSection label={`Destaques (${diary.highlights.length})`} expanded={expanded.highlights} onToggle={() => toggle('highlights')}>
              {diary.highlights.map((h, i) => (
                <div key={i} className="flex gap-2 text-xs items-start">
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase flex-shrink-0 border ${
                    h.type === 'combat' ? 'bg-red-900/50 text-red-300 border-red-700/50' :
                    h.type === 'plot'   ? 'bg-blue-900/50 text-blue-300 border-blue-700/50' :
                    h.type === 'loot'   ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' : 'bg-gray-700/50 text-gray-400 border-gray-600/50'
                  }`}>{h.type}</span>
                  <span className="text-[var(--text-secondary)] leading-relaxed">{h.description}</span>
                </div>
              ))}
            </CollapsibleSection>
          )}

          {diary.npcsEncountered?.length > 0 && (
            <CollapsibleSection label="NPCs encontrados" expanded={expanded.npcs} onToggle={() => toggle('npcs')}>
              <div className="flex flex-wrap gap-1">
                {diary.npcsEncountered.map((n, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--text-secondary)]">{n}</span>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {diary.nextSessionHooks?.length > 0 && (
            <CollapsibleSection label="Ganchos para próxima sessão" expanded={expanded.hooks} onToggle={() => toggle('hooks')}>
              <ul className="flex flex-col gap-1.5">
                {diary.nextSessionHooks.map((h, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)] flex gap-2">
                    <span className="text-[var(--brand)] flex-shrink-0">→</span>{h}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          <div className="flex gap-4 text-xs text-[var(--text-muted)] px-1">
            <span>XP: <strong className="text-[var(--text-primary)]">{diary.xpAwarded}</strong></span>
            <span>Tesouro: <strong className="text-[var(--text-primary)]">{diary.treasureFound}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ label, expanded, onToggle, children }: {
  label: string; expanded?: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button onClick={onToggle} className="flex items-center gap-1.5 w-full px-3 py-2.5 hover:bg-[var(--bg-modifier-hover)] transition-colors">
        <Icon className="w-3 h-3 text-[var(--text-muted)]" />
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
      </button>
      {expanded && <div className="px-3 pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

// ── System Conversion ──────────────────────────────────────────────────────────

function ConvertTab({ realmId, realmSystem }: { realmId: string; realmSystem: string | null }) {
  const { selectedModel } = useAppStore();
  const [fromSystem, setFromSystem] = useState('D&D 5e');
  const [toSystem, setToSystem] = useState(realmSystem ?? 'Pathfinder 2e');
  const [statsJson, setStatsJson] = useState('{\n  "name": "Goblin",\n  "hp": 7,\n  "ac": 15,\n  "str": 8,\n  "dex": 14\n}');
  const [result, setResult] = useState<SystemConversion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const stats = JSON.parse(statsJson);
      setResult(await convertStatBlock(realmId, stats, fromSystem, toSystem, undefined, selectedModel));
    } catch (e) { setError(String(e)); }
    setLoading(false);
  };

  const inputCls = 'w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)]';

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
        Converta um stat block entre sistemas usando seus rulebooks como formato-alvo.
      </p>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">De</label>
        <input value={fromSystem} onChange={(e) => setFromSystem(e.target.value)} placeholder="Sistema de origem" className={inputCls} />
      </div>
      <div className="flex items-center justify-center">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <ArrowLeftRight className="w-4 h-4 text-[var(--text-muted)] mx-3 flex-shrink-0" />
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Para</label>
        <input value={toSystem} onChange={(e) => setToSystem(e.target.value)} placeholder="Sistema de destino" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Stat Block (JSON)</label>
        <textarea value={statsJson} onChange={(e) => setStatsJson(e.target.value)} rows={6} className={`${inputCls} font-mono resize-none`} />
      </div>
      <button onClick={run} disabled={loading} className="flex items-center justify-center gap-2 py-2.5 bg-[var(--brand)] text-black rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-[var(--brand)]/90 transition-colors">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
        {loading ? 'Convertendo…' : 'Converter'}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {result && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2">
          <p className="text-xs font-bold text-[var(--brand)]">{result.originalSystem} → {result.targetSystem}</p>
          <pre className="text-[10px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-2">
            {JSON.stringify(result.convertedStats, null, 2)}
          </pre>
          {result.notes && <p className="text-[10px] text-[var(--text-muted)] italic leading-relaxed">{result.notes}</p>}
        </div>
      )}
    </div>
  );
}