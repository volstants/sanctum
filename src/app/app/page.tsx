import { Sword, Plus, Users } from 'lucide-react';
import Link from 'next/link';

export default function AppHome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-[var(--bg-tertiary)] p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[var(--brand-dim)] border border-[var(--brand)]/30 flex items-center justify-center">
          <Sword className="w-10 h-10 text-[var(--brand)]" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Welcome to Sanctum</h1>
        <p className="text-[var(--text-muted)] max-w-sm">
          Select a realm from the sidebar, or create a new one to begin your campaign.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/app/new"
          className="flex items-center gap-2 px-5 py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-lg font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Realm
        </Link>
        <Link
          href="/app/join"
          className="flex items-center gap-2 px-5 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg font-semibold text-sm transition-colors"
        >
          <Users className="w-4 h-4" />
          Join with Code
        </Link>
      </div>
    </div>
  );
}
