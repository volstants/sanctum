'use client';

import { joinRealm } from '@/lib/actions/realm';
import { motion } from 'framer-motion';
import { Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

const initialState = { error: '' };

export default function JoinRealmPage() {
  const [state, action, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await joinRealm(formData);
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
            <Users className="w-5 h-5 text-[var(--brand)]" />
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Join a Realm</h1>
          </div>
        </div>

        <p className="text-sm text-[var(--text-muted)]">
          Ask your Narrator for the invite code and enter it below.
        </p>

        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Invite Code *
            </label>
            <input
              name="code"
              required
              maxLength={20}
              placeholder="e.g. a3f9b2"
              autoComplete="off"
              spellCheck={false}
              className="px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm font-mono focus:outline-none focus:border-[var(--brand)] transition-colors tracking-widest uppercase"
            />
          </div>

          {state?.error && (
            <p className="text-[var(--danger)] text-sm">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-white rounded-lg font-bold text-sm uppercase tracking-wide transition-colors"
          >
            {isPending ? 'Joining…' : 'Join Realm'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
