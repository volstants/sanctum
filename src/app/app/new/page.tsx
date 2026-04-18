'use client';

import { createRealm } from '@/lib/actions/realm';
import { motion } from 'framer-motion';
import { Sword, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

const initialState = { error: '' };

export default function NewRealmPage() {
  const [state, action, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createRealm(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--bg-tertiary)] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border)] p-8 flex flex-col gap-6"
      >
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Sword className="w-5 h-5 text-[var(--brand)]" />
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Create a Realm</h1>
          </div>
        </div>

        <p className="text-sm text-[var(--text-muted)]">
          A Realm is your campaign space. You&apos;ll be the Narrator — invite players with a code.
        </p>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Realm Name *
            </label>
            <input
              name="name"
              required
              maxLength={60}
              placeholder="The Lost Kingdom of Arathia"
              className="px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Description
            </label>
            <textarea
              name="description"
              maxLength={280}
              rows={3}
              placeholder="A dark fantasy campaign set in a world where the gods have gone silent..."
              className="px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)] transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              RPG System
            </label>
            <input
              name="rpg_system"
              maxLength={60}
              placeholder="e.g. D&D 5e, Pathfinder 2e, Call of Cthulhu 7e..."
              className="px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--brand)] transition-colors"
            />
            <p className="text-[10px] text-[var(--text-muted)]">
              You can upload the rulebook PDFs after creating the realm. The AI will use them as the sole source of truth.
            </p>
          </div>

          {state?.error && (
            <p className="text-[var(--danger)] text-sm">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-black rounded-lg font-bold text-sm uppercase tracking-wide transition-colors"
          >
            {isPending ? 'Creating…' : 'Create Realm'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
