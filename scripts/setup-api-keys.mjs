#!/usr/bin/env node
/**
 * Sanctum — API key setup wizard
 * Run: node scripts/setup-api-keys.mjs
 *
 * For each missing/placeholder key:
 *  1. Opens the provider's key page in the default browser
 *  2. Prompts for the key
 *  3. Validates with a real API call
 *  4. Writes to .env.local
 */

import fs   from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT     = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const ENV_FILE = path.join(ROOT, '.env.local');

// ── Helpers ───────────────────────────────────────────────────────────────────

function readEnv() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const lines = fs.readFileSync(ENV_FILE, 'utf-8').split('\n');
  const map = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}

function writeKey(key, value) {
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf-8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_FILE, content);
}

function openBrowser(url) {
  try {
    const cmd =
      process.platform === 'win32'  ? `start "" "${url}"` :
      process.platform === 'darwin' ? `open "${url}"` :
                                      `xdg-open "${url}"`;
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    // silently ignore — user can open manually
  }
}

async function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function isMissing(val) {
  return !val || val === 'placeholder' || val === '' || val === 'your_key_here';
}

// ── Validators (real API calls) ───────────────────────────────────────────────

async function testGroq(key) {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

async function testOpenRouter(key) {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

async function testGemini(key) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

// ── Provider definitions ──────────────────────────────────────────────────────

const PROVIDERS = [
  {
    key:    'GROQ_API_KEY',
    name:   'Groq (Whisper audio transcription)',
    url:    'https://console.groq.com/keys',
    hint:   'Free tier — generous limits. Click "Create API Key".',
    test:   testGroq,
  },
  {
    key:    'OPENROUTER_API_KEY',
    name:   'OpenRouter (text AI — free models)',
    url:    'https://openrouter.ai/settings/keys',
    hint:   'Free account OK. Free models (Llama, Gemma, etc.) need no credits.',
    test:   testOpenRouter,
  },
  {
    key:    'GEMINI_API_KEY',
    name:   'Gemini (image→token stats)',
    url:    'https://aistudio.google.com/app/apikey',
    hint:   'Free tier available. Click "Create API key".',
    test:   testGemini,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const env = readEnv();

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   Sanctum — API Key Setup Wizard     ║');
  console.log('╚══════════════════════════════════════╝\n');

  const needed = PROVIDERS.filter((p) => isMissing(env[p.key]));

  if (needed.length === 0) {
    console.log('✅  All API keys are already configured in .env.local\n');
    console.log('Keys found:');
    for (const p of PROVIDERS) {
      const val = env[p.key] ?? '';
      console.log(`  ${p.key}: ${val.slice(0, 8)}…`);
    }
    rl.close();
    return;
  }

  console.log(`Found ${needed.length} missing key(s): ${needed.map((p) => p.key).join(', ')}\n`);

  for (const provider of needed) {
    console.log(`\n─────────────────────────────────────────`);
    console.log(`  ${provider.name}`);
    console.log(`  ${provider.hint}`);
    console.log(`─────────────────────────────────────────`);

    const open = await prompt(rl, `  Open ${provider.url} in browser? [Y/n] `);
    if (!open.trim().toLowerCase().startsWith('n')) {
      openBrowser(provider.url);
      console.log(`  → Browser opened. Generate a key and come back.\n`);
    }

    let valid = false;
    while (!valid) {
      const value = (await prompt(rl, `  Paste ${provider.key}: `)).trim();

      if (!value) {
        const skip = await prompt(rl, '  Skip this key? [y/N] ');
        if (skip.trim().toLowerCase().startsWith('y')) break;
        continue;
      }

      process.stdout.write('  Testing key… ');
      try {
        await provider.test(value);
        console.log('✅  Valid!');
        writeKey(provider.key, value);
        console.log(`  Saved to .env.local`);
        valid = true;
      } catch (e) {
        console.log(`❌  Failed: ${e.message}`);
        const retry = await prompt(rl, '  Try again? [Y/n] ');
        if (retry.trim().toLowerCase().startsWith('n')) break;
      }
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('  Setup complete. Restart the dev server:');
  console.log('  npm run dev');
  console.log('══════════════════════════════════════════\n');

  rl.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
