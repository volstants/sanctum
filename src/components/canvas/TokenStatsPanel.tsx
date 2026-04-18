'use client';

import { X, Swords, Shield, Heart } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

function modifier(score: number) {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function TokenStatsPanel() {
  const { tokens, selectedTokenId, selectToken, updateToken } = useCanvasStore();
  const token = tokens.find((t) => t.id === selectedTokenId);
  if (!token) return null;

  const stats = token.stats;

  const patchHp = (delta: number) => {
    const newHp = Math.max(0, Math.min(token.maxHp, token.hp + delta));
    updateToken(token.id, { hp: newHp });
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 w-64 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{token.name}</span>
        <button onClick={() => selectToken(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {stats && (
        <div className="text-[10px] text-[var(--text-muted)] mb-2">
          {stats.type} · CR {stats.cr}
        </div>
      )}

      {/* HP bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Heart className="w-3 h-3" /> HP
          </span>
          <span className="text-xs font-bold text-[var(--text-primary)]">{token.hp} / {token.maxHp}</span>
        </div>
        <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${token.maxHp > 0 ? (token.hp / token.maxHp) * 100 : 0}%`,
              background: token.hp / token.maxHp > 0.5 ? '#22c55e' : token.hp / token.maxHp > 0.25 ? '#eab308' : '#ef4444',
            }}
          />
        </div>
        <div className="flex gap-1 mt-1.5">
          {[-5, -1, +1, +5].map((d) => (
            <button
              key={d}
              onClick={() => patchHp(d)}
              className="flex-1 text-[10px] py-0.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-secondary)] transition-colors"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <>
          {/* AC & Speed */}
          <div className="flex gap-2 mb-2">
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Shield className="w-3 h-3" /> AC {stats.ac}
            </div>
            <div className="text-xs text-[var(--text-muted)]">· {stats.speed}</div>
          </div>

          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-1 mb-2">
            {STAT_KEYS.map((k) => (
              <div key={k} className="flex flex-col items-center bg-[var(--bg-tertiary)] rounded p-1">
                <span className="text-[8px] text-[var(--text-muted)] uppercase">{k}</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">{stats[k]}</span>
                <span className="text-[8px] text-[var(--brand)]">{modifier(stats[k] as number)}</span>
              </div>
            ))}
          </div>

          {/* Attacks */}
          <div className="mb-1.5">
            <div className="flex items-center gap-1 mb-0.5">
              <Swords className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="text-[10px] text-[var(--text-muted)] uppercase">Attacks</span>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]">{stats.attacks}</p>
          </div>

          {/* Traits */}
          {stats.traits && (
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-0.5">Traits</span>
              <p className="text-[10px] text-[var(--text-secondary)]">{stats.traits}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
