'use server';

import { GoogleGenAI } from '@google/genai';
import { getRulebookContext } from './rulebooks';

// ── Providers ─────────────────────────────────────────────────────────────────
// Gemini      → imagem (generateTokenStats) apenas
// Groq        → transcrição de áudio (Whisper large-v3)
// OpenRouter  → tudo texto: análise, diário, skills, converter

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

// ── OpenRouter models available for selection ─────────────────────────────────

export const OPENROUTER_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free',  label: 'Llama 3.3 70B'        },
  { id: 'meta-llama/llama-4-scout:free',            label: 'Llama 4 Scout'         },
  { id: 'qwen/qwen3-32b:free',                      label: 'Qwen3 32B'             },
  { id: 'qwen/qwen3.6-plus:free',                   label: 'Qwen 3.6 Plus'         },
  { id: 'google/gemma-3-27b-it:free',               label: 'Gemma 3 27B'           },
  { id: 'google/gemini-2.5-flash:free',             label: 'Gemini 2.5 Flash'      },
  { id: 'google/gemini-3.1-flash-lite:free',        label: 'Gemini 3.1 Flash Lite' },
  { id: 'mistralai/mistral-7b-instruct:free',       label: 'Mistral 7B'            },
] as const;

export type OpenRouterModelId = typeof OPENROUTER_MODELS[number]['id'];
export const DEFAULT_MODEL: OpenRouterModelId = 'meta-llama/llama-3.3-70b-instruct:free';

async function openRouterChat(
  prompt: string,
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<string> {
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
  return data.choices?.[0]?.message?.content ?? '';
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
}

// ── Token Stats from image — Gemini (único que precisa de visão) ──────────────

const FALLBACK_TOKEN_PROMPT = `Analyze this image and identify the creature or character.
Return ONLY a JSON object with:
{"name":"","type":"","hp":0,"maxHp":0,"ac":0,"speed":"30 ft.","str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10,"cr":"1","attacks":"","traits":""}`;

export async function generateTokenStats(
  imageBase64: string,
  mimeType: string,
  realmId: string,
): Promise<TokenStats> {
  const ai = getGemini();
  const rulebookContext = await getRulebookContext(realmId);

  const prompt = rulebookContext.trim()
    ? `You are a game master assistant. You MUST use ONLY the rules from the provided rulebook.
Do NOT use any external RPG knowledge. Base ALL numbers and formats exclusively on what is written below.

=== RULEBOOK (sole source of truth) ===
${rulebookContext.slice(0, 120_000)}
=== END RULEBOOK ===

Analyze the image. Identify the creature or character depicted.
Generate a stat block using ONLY the formats, ranges, and mechanics from the rulebook above.
Return ONLY a JSON object:
{"name":"","type":"","hp":0,"maxHp":0,"ac":0,"speed":"","str":0,"dex":0,"con":0,"int":0,"wis":0,"cha":0,"cr":"","attacks":"","traits":""}`
    : FALLBACK_TOKEN_PROMPT;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }] }],
  });

  return parseJSON<TokenStats>(response.text ?? '{}');
}

// ── Ability suggestions — OpenRouter ─────────────────────────────────────────

export async function suggestAbilities(
  realmId: string,
  characterDescription: string,
  currentStats: Record<string, unknown>,
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<AbilitySuggestion[]> {
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

  const raw = await openRouterChat(prompt, model);
  return parseJSON<AbilitySuggestion[]>(raw || '[]');
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

  const raw = await openRouterChat(prompt, model);
  return parseJSON<SessionDiary>(raw || '{}');
}

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

  const raw = await openRouterChat(prompt, model);
  return parseJSON<SystemConversion>(raw || '{}');
}

// ── Proactive session analysis — OpenRouter ───────────────────────────────────

export async function analyzeSession(
  realmId: string,
  recentMessages: { sender: string; content: string }[],
  model: OpenRouterModelId = DEFAULT_MODEL,
): Promise<ProactiveSuggestion[]> {
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

  const raw = await openRouterChat(prompt, model);
  return parseJSON<ProactiveSuggestion[]>(raw || '[]');
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
    return { transcript: '', suggestions: [], keyMoments: [] };
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

  const raw = await openRouterChat(prompt, model);
  const analysis = parseJSON<{
    suggestions: ProactiveSuggestion[];
    keyMoments: { timestamp: string; description: string }[];
  }>(raw || '{"suggestions":[],"keyMoments":[]}');

  return {
    transcript,
    suggestions: analysis.suggestions ?? [],
    keyMoments: analysis.keyMoments ?? [],
  };
}