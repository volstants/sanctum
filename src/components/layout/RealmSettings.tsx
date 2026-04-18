'use client';

import { deleteRealm, kickMember } from '@/lib/actions/realm';
import type { Realm, RealmMember, Rulebook } from '@/types';
import { motion } from 'framer-motion';
import { Copy, Crown, Trash2, UserMinus, ArrowLeft, BookOpen, Mic, BrainCircuit } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { RulebookManager } from '@/components/realm/RulebookManager';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import type { VoiceMode } from '@/hooks/useVoiceMode';

interface Props {
  realm: Realm;
  members: RealmMember[];
  currentUserId: string;
  rulebooks: Rulebook[];
}

export function RealmSettings({ realm, members, currentUserId, rulebooks }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { mode: voiceMode, setMode: setVoiceMode } = useVoiceMode(realm.id);

  const copyCode = () => {
    navigator.clipboard.writeText(realm.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-tertiary)] p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/app/realm/${realm.id}`}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{realm.name}</h1>
            <p className="text-xs text-[var(--text-muted)]">Realm Settings</p>
          </div>
        </div>

        {/* Invite Code */}
        <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Invite Code</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-4 py-3 bg-[var(--bg-primary)] rounded-lg font-mono text-lg tracking-[0.3em] text-[var(--brand)] border border-[var(--border-strong)] uppercase">
              {realm.invite_code}
            </code>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-[var(--brand-dim)] hover:bg-[var(--brand)]/20 border border-[var(--brand)]/30 rounded-lg text-[var(--brand)] text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Share this code with players. Each code is unique to your realm.
          </p>
        </section>

        {/* Members */}
        <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Members — {members.length}
          </h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <motion.div
                key={m.user_id}
                layout
                className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--brand-dim)] flex items-center justify-center text-[var(--brand)] text-xs font-bold flex-shrink-0">
                  {m.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{m.display_name}</p>
                  <p className="text-xs text-[var(--text-muted)] capitalize">{m.role}</p>
                </div>
                {m.role === 'narrator' && (
                  <Crown className="w-4 h-4 text-[var(--brand)]" />
                )}
                {m.user_id !== currentUserId && m.role !== 'narrator' && (
                  <form action={async () => { await kickMember(realm.id, m.user_id); }}>
                    <button
                      type="submit"
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors rounded"
                      title="Remove member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* RPG System & Rulebooks */}
        <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> RPG System & Rulebooks
            </h2>
            {realm.rpg_system && (
              <p className="text-sm text-[var(--brand)] font-semibold mt-1">{realm.rpg_system}</p>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Upload the PDFs of your RPG system. The AI Co-Master will use them as the sole source of truth — no external knowledge.
          </p>
          <RulebookManager realmId={realm.id} initialRulebooks={rulebooks} />
        </section>

        {/* Co-Master Audio */}
        <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
            <BrainCircuit className="w-3.5 h-3.5" /> Co-Master — Modo de Escuta
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Define como o Co-Master captura a sessão presencial para gerar sugestões e diário.
          </p>

          <div className="flex flex-col gap-3">
            {([
              {
                value: 'speech' as VoiceMode,
                icon: Mic,
                label: 'Reconhecimento de Voz (Speech API)',
                desc: 'Transcrição em tempo real no browser — gratuito, zero latência. Funciona offline. Vocabulário genérico (pode errar termos de RPG).',
                badge: 'Recomendado · Free',
                badgeCls: 'bg-green-900/40 text-green-400',
              },
              {
                value: 'audio' as VoiceMode,
                icon: BrainCircuit,
                label: 'Áudio direto para o Gemini',
                desc: 'Grava chunks de 45s e envia ao Gemini para transcrever + analisar simultaneamente. Entende contexto de RPG melhor. Requer plano pago de hosting (Vercel Pro ou similar — server timeout >10s).',
                badge: 'Melhor qualidade · Hosting pago',
                badgeCls: 'bg-yellow-900/40 text-yellow-400',
              },
            ] as const).map(({ value, icon: Icon, label, desc, badge, badgeCls }) => (
              <button
                key={value}
                onClick={() => setVoiceMode(value)}
                className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-colors ${
                  voiceMode === value
                    ? 'border-[var(--brand)] bg-[var(--brand-dim)]'
                    : 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  voiceMode === value ? 'bg-[var(--brand)] text-black' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${badgeCls}`}>{badge}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--danger)]/30 p-6 flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--danger)]">Danger Zone</h2>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-[var(--danger)]/40 text-[var(--danger)] rounded-lg text-sm font-semibold hover:bg-[var(--danger)]/10 transition-colors w-fit"
            >
              <Trash2 className="w-4 h-4" />
              Delete Realm
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--text-secondary)]">
                This will permanently delete <strong>{realm.name}</strong>, all channels, messages, characters, and maps. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <form action={async () => { await deleteRealm(realm.id); }}>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--danger)] hover:bg-[var(--danger-hover)] text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    Yes, Delete Forever
                  </button>
                </form>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm font-semibold hover:border-[var(--border-strong)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
