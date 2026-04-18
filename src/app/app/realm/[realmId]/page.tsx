import { Hash } from 'lucide-react';

export default function RealmHome() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
      <Hash className="w-16 h-16 text-[var(--text-muted)]" />
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Select a channel</h2>
      <p className="text-[var(--text-muted)] text-sm">Pick a channel from the left to start.</p>
    </div>
  );
}
