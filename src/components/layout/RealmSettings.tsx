'use client';

import { deleteRealm, kickMember } from '@/lib/actions/realm';
import type { Realm, RealmMember } from '@/types';
import { motion } from 'framer-motion';
import { Copy, Crown, Trash2, UserMinus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface Props {
  realm: Realm;
  members: RealmMember[];
  currentUserId: string;
}

export function RealmSettings({ realm, members, currentUserId }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
