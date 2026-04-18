'use server';

import { GoogleGenAI } from '@google/genai';
import { getRulebookContext } from './rulebooks';

export interface TokenStats {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  ac: number;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  cr: string;
  attacks: string;
  traits: string;
}

export interface AbilitySuggestion {
  name: string;
  description: string;
  mechanic: string;
  source: string;
}

export interface SessionDiary {
  title: string;
  summary: string;
  highlights: { type: string; description: string }[];
  npcsEncountered: string[];
  xpAwarded: string;
  treasureFound: string;
  nextSessionHooks: string[];
}

export interface SystemConversion {
  originalSystem: string;
  targetSystem: string;
  convertedStats: Record<string, string | number>;
  notes: string;
}

export type ProactiveSuggestionType = 'rule' | 'npc' | 'plot' | 'encounter' | 'ability';

export interface ProactiveSuggestion {
  type: ProactiveSuggestionType;
  title: string;
  description: string;
  mechanic: string;
  source: string;
}

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') throw new Error('GEMINI_API_KEY não configurada');
  return new GoogleGenAI({ apiKey });
}

function parseJSON<T>(raw: string): T {
  const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(json) as T;
}

// ── Token Stats from image ────────────────────────────────────────────────────

const FALLBACK_TOKEN_PROMPT = `Analyze this image and identify the creature or character.
Return ONLY a JSON object with:
{"name":"","type":"","hp":0,"maxHp":0,"ac":0,"speed":"30 ft.","str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10,"cr":"1","attacks":"","traits":""}`;

export async function generateTokenStats(
  imageBase64: string,
  mimeType: string,
  realmId: string,
): Promise<TokenStats> {
  const ai = getAI();
  const rulebookContext = await getRulebookContext(realmId);

  let prompt: string;

  if (rulebookContext.trim()) {
    prompt = `You are a game master assistant. You MUST use ONLY the rules from the provided rulebook.
Do NOT use any external RPG knowledge. Base ALL numbers and formats exclusively on what is written below.

=== RULEBOOK (sole source of truth) ===
${rulebookContext.slice(0, 120_000)}
=== END RULEBOOK ===

Analyze the image. Identify the creature or character depicted.
Generate a stat block using ONLY the formats, ranges, and mechanics from the rulebook above.
If the rulebook doesn't define a value type, omit it or set to 0.

Return ONLY a JSON object with this structure (adapt values to match the rulebook's system):
{"name":"","type":"","hp":0,"maxHp":0,"ac":0,"speed":"","str":0,"dex":0,"con":0,"int":0,"wis":0,"cha":0,"cr":"","attacks":"","traits":""}`;
  } else {
    prompt = FALLBACK_TOKEN_PROMPT;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }] }],
  });

  return parseJSON<TokenStats>(response.text ?? '{}');
}

// ── Ability suggestions ────────────────────────────────────────────────────────

export async function suggestAbilities(
  realmId: string,
  characterDescription: string,
  currentStats: Record<string, unknown>,
): Promise<AbilitySuggestion[]> {
  const ai = getAI();
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

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return parseJSON<AbilitySuggestion[]>(response.text ?? '[]');
}

// ── Session diary generator ───────────────────────────────────────────────────

export async function generateSessionDiary(
  realmId: string,
  messages: { sender: string; content: string; timestamp: string }[],
  sessionTitle?: string,
): Promise<SessionDiary> {
  const ai = getAI();
  const rulebookContext = await getRulebookContext(realmId);

  const systemHint = rulebookContext.trim()
    ? `The campaign uses the following rule system:\n${rulebookContext.slice(0, 20_000)}\n\n`
    : '';

  const chatLog = messages
    .map((m) => `[${m.timestamp}] ${m.sender}: ${m.content}`)
    .join('\n');

  const prompt = `${systemHint}You are a session scribe. Based on the chat log below, write a session diary.

CHAT LOG:
${chatLog.slice(0, 60_000)}

Return ONLY a JSON object:
{
  "title": "${sessionTitle ?? 'Session Diary'}",
  "summary": "2-3 paragraph narrative summary of what happened",
  "highlights": [{"type":"combat|plot|death_risk|loot|roleplay","description":""}],
  "npcsEncountered": ["npc names"],
  "xpAwarded": "XP or equivalent reward if mentioned, else 'Not recorded'",
  "treasureFound": "items/gold found or 'None'",
  "nextSessionHooks": ["unresolved plot threads or cliffhangers"]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return parseJSON<SessionDiary>(response.text ?? '{}');
}

// ── System conversion ─────────────────────────────────────────────────────────

export async function convertStatBlock(
  realmId: string,
  stats: Record<string, unknown>,
  fromSystem: string,
  toSystem: string,
  targetRulebookContext?: string,
): Promise<SystemConversion> {
  const ai = getAI();
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

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return parseJSON<SystemConversion>(response.text ?? '{}');
}

// ── Proactive session analysis ────────────────────────────────────────────────

export async function analyzeSession(
  realmId: string,
  recentMessages: { sender: string; content: string }[],
): Promise<ProactiveSuggestion[]> {
  const ai = getAI();
  const rulebookContext = await getRulebookContext(realmId);

  const ruleSection = rulebookContext.trim()
    ? `Use ONLY the following rulebook as reference. Do not use external RPG knowledge.\n\n=== RULEBOOK ===\n${rulebookContext.slice(0, 60_000)}\n=== END ===\n\n`
    : '';

  const log = recentMessages.map((m) => `${m.sender}: ${m.content}`).join('\n');

  const prompt = `${ruleSection}You are an AI Co-Master assistant watching a tabletop RPG session in real time.

RECENT SESSION LOG:
${log}

Based on what is happening, generate 2-4 proactive suggestions to help the narrator.
Focus on: rules that apply right now, relevant NPCs to introduce, plot opportunities, encounter ideas, or ability checks needed.

Return ONLY a JSON array:
[
  {
    "type": "rule|npc|plot|encounter|ability",
    "title": "Short title (max 8 words)",
    "description": "What the narrator should know or do right now",
    "mechanic": "Exact rule text, roll formula, or empty string",
    "source": "Rulebook section/page or 'GM judgment'"
  }
]`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return parseJSON<ProactiveSuggestion[]>(response.text ?? '[]');
}

// ── Audio chunk transcription + analysis ──────────────────────────────────────

export interface AudioChunkResult {
  transcript: string;
  suggestions: ProactiveSuggestion[];
  keyMoments: { timestamp: string; description: string }[];
}

export async function transcribeAudioChunk(
  audioBase64: string,
  mimeType: string,
  realmId: string,
  sessionContext: string, // recent transcript so far for continuity
): Promise<AudioChunkResult> {
  const ai = getAI();
  const rulebookContext = await getRulebookContext(realmId);

  const ruleSection = rulebookContext.trim()
    ? `Use ONLY these rules as reference. Do not use external RPG knowledge.\n\n=== RULEBOOK ===\n${rulebookContext.slice(0, 40_000)}\n=== END ===\n\n`
    : '';

  const contextSection = sessionContext.trim()
    ? `=== TRANSCRIÇÃO ANTERIOR (contexto) ===\n${sessionContext.slice(-3_000)}\n=== FIM ===\n\n`
    : '';

  const prompt = `${ruleSection}${contextSection}Você é o Co-Mestre de IA de uma sessão de RPG de mesa presencial.
Este áudio é um trecho de ~45 segundos da sessão gravada com microfone ambiente.

Tarefas:
1. TRANSCREVER o áudio fielmente (português). Identifique quem fala quando possível (Narrador / Jogador).
2. IDENTIFICAR momentos-chave (combate iniciado, decisão importante, dado rolado, NPC introduzido, etc.)
3. GERAR 0-3 sugestões proativas para o narrador baseadas no que acabou de acontecer.

Retorne APENAS um JSON com esta estrutura:
{
  "transcript": "transcrição completa do áudio",
  "keyMoments": [
    {"timestamp": "início do chunk", "description": "o que aconteceu"}
  ],
  "suggestions": [
    {
      "type": "rule|npc|plot|encounter|ability",
      "title": "título curto",
      "description": "o que o narrador deve saber agora",
      "mechanic": "regra exata ou fórmula de rolagem, ou vazio",
      "source": "seção do livro ou 'critério do narrador'"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: prompt },
      ],
    }],
  });

  return parseJSON<AudioChunkResult>(response.text ?? '{"transcript":"","suggestions":[],"keyMoments":[]}');
}
