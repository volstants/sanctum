'use client';

import { useState } from 'react';
import { Loader2, X, Wand2 } from 'lucide-react';
import type { TokenStats } from '@/lib/actions/ai';

interface Props {
  imageUrl: string;
  stats: TokenStats | null;
  loading: boolean;
  error: string | null;
  onConfirm: (stats: TokenStats, name: string) => void;
  onCancel: () => void;
}

const STAT_KEYS: (keyof TokenStats)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function modifier(score: number) {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function TokenStatsModal({ imageUrl, stats, loading, error, onConfirm, onCancel }: Props) {
  const [edited, setEdited] = useState<TokenStats | null>(null);
  const current = edited ?? stats;

  const patch = (key: keyof TokenStats, value: string | number) => {
    const base = current ?? ({} as TokenStats);
    setEdited({ ...base, [key]: typeof base[key] === 'number' ? Number(value) : value } as TokenStats);
  };

  const handleConfirm = () => {
    if (!current) return;
    onConfirm(current, current.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[var(--brand)]" />
            <span className="font-semibold text-[var(--text-primary)] text-sm">AI Token Generator</span>
          </div>
          <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex gap-4">
          {/* Image preview */}
          <img src={imageUrl} alt="token" className="w-24 h-24 object-cover rounded-lg border border-[var(--border)] flex-shrink-0" />

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--brand)]" />
              <span className="text-xs">Analyzing image...</span>
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center text-red-400 text-sm">{error}</div>
          )}

          {current && !loading && (
            <div className="flex-1 min-w-0">
              {/* Name */}
              <input
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-sm font-semibold text-[var(--text-primary)] mb-1"
                value={current.name}
                onChange={(e) => patch('name', e.target.value)}
              />
              <div className="text-[10px] text-[var(--text-muted)] mb-3">
                {current.type} · CR {current.cr} · AC {current.ac} · {current.speed}
              </div>

              {/* Ability scores */}
              <div className="grid grid-cols-6 gap-1 mb-3">
                {STAT_KEYS.map((k) => (
                  <div key={k} className="flex flex-col items-center bg-[var(--bg-tertiary)] rounded p-1">
                    <span className="text-[9px] text-[var(--text-muted)] uppercase">{k}</span>
                    <input
                      type="number"
                      className="w-full bg-transparent text-center text-sm font-bold text-[var(--text-primary)] outline-none"
                      value={current[k] as number}
                      onChange={(e) => patch(k, e.target.value)}
                    />
                    <span className="text-[9px] text-[var(--brand)]">{modifier(current[k] as number)}</span>
                  </div>
                ))}
              </div>

              {/* HP */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[var(--text-muted)] w-6">HP</span>
                <input
                  type="number"
                  className="w-16 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-0.5 text-sm text-[var(--text-primary)]"
                  value={current.hp}
                  onChange={(e) => { patch('hp', e.target.value); patch('maxHp', e.target.value); }}
                />
              </div>

              {/* Attacks */}
              <div className="mb-2">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-0.5">Attacks</span>
                <input
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
                  value={current.attacks}
                  onChange={(e) => patch('attacks', e.target.value)}
                />
              </div>

              {/* Traits */}
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-0.5">Traits</span>
                <textarea
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] resize-none"
                  rows={2}
                  value={current.traits}
                  onChange={(e) => patch('traits', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 pb-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!current || loading}
            className="px-4 py-1.5 text-sm font-semibold bg-[var(--brand)] text-black rounded-md disabled:opacity-40 hover:bg-[var(--brand)]/90 transition-colors"
          >
            Place Token
          </button>
        </div>
      </div>
    </div>
  );
}
