'use server';

import { GoogleGenAI } from '@google/genai';
import { getRulebookContext } from './rulebooks';
import { DEFAULT_MODEL } from '@/lib/ai-models';
import type { OpenRouterModelId } from '@/lib/ai-models';

// ── Providers ─────────────────────────────────────────────────────────────────
// Gemini      → visão (preferencial, se GEMINI_API_KEY disponível)
// OpenRouter  → visão (fallback) + todo texto
// Groq        → transcrição de áudio (Whisper large-v3)

function hasGemini() {
  const k = process.env.GEMINI_API_KEY;
  return !!(k && k !== 'placeholder');
}

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') throw new Error('GEMINI_API_KEY não configurada');
  return new GoogleGenAI({ apiKey });
}

function getGroqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'placeholder') throw new Error('GROQ_API_KEY não configurada');
  return key;
}

function getOpenRouterKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key === 'placeholder') throw new Error('OPENROUTER_API_KEY não configurada');
  return key;
}

// ── OpenRouter: text ──────────────────────────────────────────────────────────

async function openRouterChat(
  prompt: string,
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<{ content: string; tokensUsed: number }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getOpenRouterKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sanctum.app',
      'X-Title': 'Sanctum RPG',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content:    data.choices?.[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

// ── OpenRouter: vision ────────────────────────────────────────────────────────
// Vision-capable free models on OpenRouter
const VISION_MODEL = 'google/gemini-2.5-flash:free';

async function openRouterVision(
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<{ content: string; tokensUsed: number }> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getOpenRouterKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sanctum.app',
      'X-Title': 'Sanctum RPG',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: prompt },
        ],
      }],
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter vision ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    content:    data.choices?.[0]?.message?.content ?? '',
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

function parseJSON<T>(raw: string): T {
  const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(json) as T;
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface TokenStats {
  name: string; type: string; hp: number; maxHp: number; ac: number;
  speed: string; str: number; dex: number; con: number; int: number;
  wis: number; cha: number; cr: string; attacks: string; traits: string;
}

export interface AbilitySuggestion {
  name: string; description: string; mechanic: string; source: string;
}

export interface SessionDiary {
  title: string; summary: string;
  highlights: { type: string; description: string }[];
  npcsEncountered: string[]; xpAwarded: string;
  treasureFound: string; nextSessionHooks: string[];
}

export interface SystemConversion {
  originalSystem: string; targetSystem: string;
  convertedStats: Record<string, string | number>; notes: string;
}

export type ProactiveSuggestionType = 'rule' | 'npc' | 'plot' | 'encounter' | 'ability';

export interface ProactiveSuggestion {
  type: ProactiveSuggestionType; title: string; description: string;
  mechanic: string; source: string;
}

export interface AudioChunkResult {
  transcript: string;
  suggestions: ProactiveSuggestion[];
  keyMoments: { timestamp: string; description: string }[];
  tokensUsed: number;
}

// Generic wrapper for token-aware results
export interface WithTokens<T> { data: T; tokensUsed: number; }

// ── Token Stats from image — Gemini (preferencial) ou OpenRouter vision ───────

const IMAGE_ANALYSIS_PROMPT_SUFFIX = `
Analyze the image. Identify the creature or character depicted.
Generate a stat block using ONLY the formats, ranges, and mechanics from the rulebook above.
Return ONLY a JSON object:
{"name":"","type":"","hp":0,"maxHp":0,"ac":0,"speed":"","str":0,"dex":0,"con":0,"int":0,"wis":0,"cha":0,"cr":"","attacks":"","traits":""}`;

const FALLBACK_TOKEN_PROMPT = `Analyze this image and identify the creature or character.
Return ONLY a JSON object:
{"name":"","type":"","hp":0,"maxHp":0,"ac":0,"speed":"30 ft.","str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10,"cr":"1","attacks":"","traits":""}`;

export async function generateTokenStats(
  imageBase64: string,
  mimeType: string,
  realmId: string,
): Promise<TokenStats & { tokensUsed: number; visionProvider: 'gemini' | 'openrouter' }> {
  const rulebookContext = await getRulebookContext(realmId);

  const prompt = rulebookContext.trim()
    ? `You are a game master assistant. You MUST use ONLY the rules from the provided rulebook.
Do NOT use any external RPG knowledge. Base ALL numbers and formats exclusively on what is written below.

=== RULEBOOK (sole source of truth) ===
${rulebookContext.slice(0, 120_000)}
=== END RULEBOOK ===
${IMAGE_ANALYSIS_PROMPT_SUFFIX}`
    : FALLBACK_TOKEN_PROMPT;

  // Use Gemini if key available, else OpenRouter vision
  if (hasGemini()) {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }] }],
    });
    const tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
    return { ...parseJSON<TokenStats>(response.text ?? '{}'), tokensUsed, visionProvider: 'gemini' };
  }

  // Fallback: OpenRouter vision
  const { content, tokensUsed } = await openRouterVision(imageBase64, mimeType, prompt);
  return { ...parseJSON<TokenStats>(content || '{}'), tokensUsed, visionProvider: 'openrouter' };
}

// ── Ability suggestions from image — Gemini or OpenRouter vision ──────────────

export async function suggestAbilitiesFromImage(
  imageBase64: string,
  mimeType: string,
  realmId: string,
  extraDescription: string = '',
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<{ suggestions: AbilitySuggestion[]; tokensUsed: number }> {
  const rulebookContext = await getRulebookContext(realmId);

  const ruleSection = rulebookContext.trim()
    ? `Use ONLY the following rulebook as source for mechanics, ranges and formats.\n\n=== RULEBOOK ===\n${rulebookContext.slice(0, 80_000)}\n=== END ===\n\n`
    : 'Use D&D 5e rules as reference.\n\n';

  const extraSection = extraDescription.trim()
    ? `Additional context provided by the user: ${extraDescription}\n\n`
    : '';

  const prompt = `${ruleSection}${extraSection}Look at the character or creature in the image.
Based on their visual appearance, equipment, posture, and style, suggest 4 appropriate abilities or features.
${extraDescription ? 'Also consider the additional context provided above.' : ''}

Return ONLY a JSON array:
[{"name":"","description":"","mechanic":"(exact rule text or formula)","source":"(rulebook page/section or 'general rule')"}]`;

  let content: string;
  let tokensUsed: number;

  if (hasGemini()) {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }] }],
    });
    content = response.text ?? '[]';
    tokensUsed = response.usageMetadata?.totalTokenCount ?? 0;
  } else {
    ({ content, tokensUsed } = await openRouterVision(imageBase64, mimeType, prompt));
  }

  return { suggestions: parseJSON<AbilitySuggestion[]>(content || '[]'), tokensUsed };
}

// ── Ability suggestions — OpenRouter ─────────────────────────────────────────

export async function suggestAbilities(
  realmId: string,
  characterDescription: string,
  currentStats: Record<string, unknown>,
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<{ suggestions: AbilitySuggestion[]; tokensUsed: number }> {
  const rulebookContext = await getRulebookContext(realmId);

  const systemSection = rulebookContext.trim()
    ? `Use ONLY the following rulebook as source. Do not invent mechanics not present in it.\n\n=== RULEBOOK ===\n${rulebookContext.slice(0, 80_000)}\n=== END ===`
    : 'Use D&D 5e rules.';

  const prompt = `${systemSection}

Character description: ${characterDescription}
Current stats: ${JSON.stringify(currentStats)}

Suggest 4 abilities or features appropriate for this character.
Return ONLY a JSON array:
[{"name":"","description":"","mechanic":"(exact rule text or formula)","source":"(page/section in rulebook or 'general rule')"}]`;

  const { content, tokensUsed } = await openRouterChat(prompt, model);
  return { suggestions: parseJSON<AbilitySuggestion[]>(content || '[]'), tokensUsed };
}

// ── Session diary — OpenRouter ────────────────────────────────────────────────

export async function generateSessionDiary(
  realmId: string,
  messages: { sender: string; content: string; timestamp: string }[],
  sessionTitle?: string,
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<SessionDiary> {
  const rulebookContext = await getRulebookContext(realmId);

  const systemHint = rulebookContext.trim()
    ? `The campaign uses the following rule system:\n${rulebookContext.slice(0, 20_000)}\n\n`
    : '';

  const chatLog = messages.map((m) => `[${m.timestamp}] ${m.sender}: ${m.content}`).join('\n');

  const prompt = `${systemHint}You are a session scribe. Based on the chat log below, write a session diary in Portuguese (pt-BR).

CHAT LOG:
${chatLog.slice(0, 60_000)}

Return ONLY a JSON object:
{
  "title": "${sessionTitle ?? 'Diário de Sessão'}",
  "summary": "resumo narrativo de 2-3 parágrafos",
  "highlights": [{"type":"combat|plot|death_risk|loot|roleplay","description":""}],
  "npcsEncountered": ["nomes dos NPCs"],
  "xpAwarded": "XP ou recompensa, ou 'Não registrado'",
  "treasureFound": "itens/ouro ou 'Nenhum'",
  "nextSessionHooks": ["ganchos para a próxima sessão"]
}`;

  const { content, tokensUsed } = await openRouterChat(prompt, model);
  return { diary: parseJSON<SessionDiary>(content || '{}'), tokensUsed };
}

// Fix return type
export type GenerateSessionDiaryResult = { diary: SessionDiary; tokensUsed: number };

// ── System conversion — OpenRouter ───────────────────────────────────────────

export async function convertStatBlock(
  realmId: string,
  stats: Record<string, unknown>,
  fromSystem: string,
  toSystem: string,
  targetRulebookContext?: string,
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<SystemConversion> {
  const ownContext = await getRulebookContext(realmId);
  const targetContext = targetRulebookContext ?? ownContext;

  const systemSection = targetContext.trim()
    ? `Target system rulebook (use ONLY this for output format and ranges):\n${targetContext.slice(0, 60_000)}\n`
    : `Target system: ${toSystem}`;

  const prompt = `Convert this stat block from ${fromSystem} to ${toSystem}.

${systemSection}

Original stat block (${fromSystem}):
${JSON.stringify(stats, null, 2)}

Return ONLY a JSON object:
{
  "originalSystem": "${fromSystem}",
  "targetSystem": "${toSystem}",
  "convertedStats": {"field": "value"},
  "notes": "conversion notes and approximations made"
}`;

  const { content, tokensUsed } = await openRouterChat(prompt, model);
  return { conversion: parseJSON<SystemConversion>(content || '{}'), tokensUsed };
}

// ── Proactive session analysis — OpenRouter ───────────────────────────────────

export async function analyzeSession(
  realmId: string,
  recentMessages: { sender: string; content: string }[],
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<{ suggestions: ProactiveSuggestion[]; tokensUsed: number }> {
  const rulebookContext = await getRulebookContext(realmId);

  const ruleSection = rulebookContext.trim()
    ? `Use ONLY the following rulebook as reference. Do not use external RPG knowledge.\n\n=== RULEBOOK ===\n${rulebookContext.slice(0, 60_000)}\n=== END ===\n\n`
    : '';

  const log = recentMessages.map((m) => `${m.sender}: ${m.content}`).join('\n');

  const prompt = `${ruleSection}You are an AI Co-Master assistant watching a tabletop RPG session in real time. Respond in Portuguese (pt-BR).

RECENT SESSION LOG:
${log}

Generate 2-4 proactive suggestions to help the narrator right now.
Focus on: rules that apply, NPCs to introduce, plot opportunities, encounter ideas, ability checks needed.

Return ONLY a JSON array:
[
  {
    "type": "rule|npc|plot|encounter|ability",
    "title": "Título curto (máx 8 palavras)",
    "description": "O que o narrador deve saber ou fazer agora",
    "mechanic": "Regra exata, fórmula de rolagem, ou string vazia",
    "source": "Seção/página do livro ou 'critério do narrador'"
  }
]`;

  const { content, tokensUsed } = await openRouterChat(prompt, model);
  return { suggestions: parseJSON<ProactiveSuggestion[]>(content || '[]'), tokensUsed };
}

// ── Audio transcription — Groq Whisper ───────────────────────────────────────

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  const key = getGroqKey();
  const binary = Buffer.from(audioBase64, 'base64');
  const blob = new Blob([binary], { type: mimeType });
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';

  const form = new FormData();
  form.append('file', blob, `audio.${ext}`);
  form.append('model', 'whisper-large-v3');
  form.append('language', 'pt');
  form.append('response_format', 'text');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Whisper ${res.status}: ${err}`);
  }

  return (await res.text()).trim();
}

// ── Provider availability check ───────────────────────────────────────────────

export interface ProviderStatus {
  gemini: boolean;
  groq: boolean;
  openRouter: boolean;
}

export async function getProviderStatus(): Promise<ProviderStatus> {
  return {
    gemini:      !!(process.env.GEMINI_API_KEY      && process.env.GEMINI_API_KEY      !== 'placeholder'),
    groq:        !!(process.env.GROQ_API_KEY         && process.env.GROQ_API_KEY         !== 'placeholder'),
    openRouter:  !!(process.env.OPENROUTER_API_KEY   && process.env.OPENROUTER_API_KEY   !== 'placeholder'),
  };
}

// ── Audio chunk: transcribe (Groq Whisper) + analyze (OpenRouter) ─────────────

export async function transcribeAudioChunk(
  audioBase64: string,
  mimeType: string,
  realmId: string,
  sessionContext: string,
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<AudioChunkResult> {
  // Step 1 — transcrição com Groq Whisper
  let transcript = '';
  try {
    transcript = await transcribeAudio(audioBase64, mimeType);
  } catch (e) {
    throw new Error(`Transcrição falhou: ${e}`);
  }

  if (!transcript.trim()) {
    return { transcript: '', suggestions: [], keyMoments: [], tokensUsed: 0 };
  }

  // Step 2 — análise com OpenRouter
  const rulebookContext = await getRulebookContext(realmId);

  const ruleSection = rulebookContext.trim()
    ? `Use ONLY these rules as reference.\n\n=== RULEBOOK ===\n${rulebookContext.slice(0, 40_000)}\n=== END ===\n\n`
    : '';

  const contextSection = sessionContext.trim()
    ? `=== TRANSCRIÇÃO ANTERIOR (contexto) ===\n${sessionContext.slice(-3_000)}\n=== FIM ===\n\n`
    : '';

  const prompt = `${ruleSection}${contextSection}Você é o Co-Mestre de IA de uma sessão de RPG de mesa presencial.

TRANSCRIÇÃO DO ÚLTIMO TRECHO (~60 segundos):
${transcript}

Tarefas:
1. IDENTIFICAR momentos-chave (combate iniciado, decisão importante, dado rolado, NPC introduzido, etc.)
2. GERAR 0-3 sugestões proativas para o narrador.

Retorne APENAS um JSON:
{
  "keyMoments": [{"timestamp": "agora", "description": "o que aconteceu"}],
  "suggestions": [
    {
      "type": "rule|npc|plot|encounter|ability",
      "title": "título curto",
      "description": "o que o narrador deve saber agora",
      "mechanic": "regra exata ou fórmula, ou string vazia",
      "source": "seção do livro ou 'critério do narrador'"
    }
  ]
}`;

  const { content, tokensUsed } = await openRouterChat(prompt, model);
  const analysis = parseJSON<{
    suggestions: ProactiveSuggestion[];
    keyMoments: { timestamp: string; description: string }[];
  }>(content || '{"suggestions":[],"keyMoments":[]}');

  return {
    transcript,
    suggestions: analysis.suggestions ?? [],
    keyMoments: analysis.keyMoments ?? [],
    tokensUsed,
  };
}