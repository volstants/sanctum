'use client';

import { useState } from 'react';
import { X, Loader2, User } from 'lucide-react';
import type { JournalCharacter } from '@/lib/actions/journal';

interface Props {
  initial?: JournalCharacter;
  saving: boolean;
  onSave: (data: Partial<JournalCharacter>) => void;
  onClose: () => void;
}

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export function CharacterModal({ initial, saving, onSave, onClose }: Props) {
  const [form, setForm] = useState<Partial<JournalCharacter>>({
    name: initial?.name ?? '',
    class: initial?.class ?? '',
    level: initial?.level ?? 1,
    hp: initial?.hp ?? 10,
    max_hp: initial?.max_hp ?? 10,
    stats: initial?.stats ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    bio: initial?.bio ?? '',
    notes: initial?.notes ?? '',
    inventory: initial?.inventory ?? '',
    is_npc: initial?.is_npc ?? false,
    avatar_url: initial?.avatar_url ?? '',
  });

  const patch = (key: keyof typeof form, value: unknown) => setForm((f) => ({ ...f, [key]: value }));
  const patchStat = (key: string, value: string) => setForm((f) => ({ ...f, stats: { ...(f.stats ?? {}), [key]: Number(value) } }));

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => patch('avatar_url', ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <span className="font-semibold text-[var(--text-primary)] text-sm">
            {initial ? `Edit ${initial.name}` : 'New Character'}
          </span>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Avatar + Name row */}
          <div className="flex gap-4">
            {/* Avatar drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleImageDrop}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--border)] flex-shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[var(--brand)] transition-colors"
            >
              {form.avatar_url
                ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-[var(--text-muted)]" />}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <input
                value={form.name ?? ''}
                onChange={(e) => patch('name', e.target.value)}
                placeholder="Character name *"
                className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)]"
              />
              <div className="flex gap-2">
                <input
                  value={form.class ?? ''}
                  onChange={(e) => patch('class', e.target.value)}
                  placeholder="Class / Role"
                  className="flex-1 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)]"
                />
                <input
                  type="number"
                  value={form.level ?? 1}
                  onChange={(e) => patch('level', Number(e.target.value))}
                  min={1} max={30}
                  className="w-16 px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] text-center"
                  title="Level"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                <input type="checkbox" checked={form.is_npc ?? false} onChange={(e) => patch('is_npc', e.target.checked)} className="rounded" />
                NPC (Narrator controlled)
              </label>
            </div>
          </div>

          {/* HP */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[var(--text-muted)] w-6">HP</span>
            <input type="number" value={form.hp} onChange={(e) => patch('hp', Number(e.target.value))} className="w-20 px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] text-center" />
            <span className="text-[var(--text-muted)] text-sm">/</span>
            <input type="number" value={form.max_hp} onChange={(e) => patch('max_hp', Number(e.target.value))} className="w-20 px-2 py-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] text-center" />
          </div>

          {/* Ability scores */}
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Ability Scores</p>
            <div className="grid grid-cols-6 gap-1.5">
              {STAT_KEYS.map((k) => (
                <div key={k} className="flex flex-col items-center bg-[var(--bg-tertiary)] rounded-lg p-2">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase">{k}</span>
                  <input
                    type="number"
                    value={(form.stats as Record<string, number>)?.[k] ?? 10}
                    onChange={(e) => patchStat(k, e.target.value)}
                    className="w-full bg-transparent text-center text-sm font-bold text-[var(--text-primary)] outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Bio & Info</p>
            <textarea
              value={form.bio ?? ''}
              onChange={(e) => patch('bio', e.target.value)}
              placeholder="Background, description, personality..."
              rows={3}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">GM Notes</p>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => patch('notes', e.target.value)}
              placeholder="Private notes (narrator only)..."
              rows={2}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name?.trim()}
            className="px-5 py-2 text-sm font-bold bg-[var(--brand)] text-black rounded-lg disabled:opacity-40 hover:bg-[var(--brand)]/90 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
