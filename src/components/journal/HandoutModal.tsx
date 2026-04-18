'use client';

import { useState } from 'react';
import { X, Loader2, Eye, EyeOff, ImageIcon } from 'lucide-react';
import type { JournalHandout } from '@/lib/actions/journal';

interface Props {
  initial?: JournalHandout;
  saving: boolean;
  onSave: (data: Partial<JournalHandout>) => void;
  onClose: () => void;
}

export function HandoutModal({ initial, saving, onSave, onClose }: Props) {
  const [form, setForm] = useState<Partial<JournalHandout>>({
    name: initial?.name ?? '',
    content: initial?.content ?? '',
    image_url: initial?.image_url ?? null,
    tags: initial?.tags ?? [],
    visible_to_players: initial?.visible_to_players ?? false,
  });

  const patch = (key: keyof typeof form, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => patch('image_url', ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-[560px] max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <span className="font-semibold text-[var(--text-primary)] text-sm">
            {initial ? `Edit: ${initial.name}` : 'New Handout'}
          </span>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Name */}
          <input
            value={form.name ?? ''}
            onChange={(e) => patch('name', e.target.value)}
            placeholder="Handout name *"
            className="px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)]"
          />

          {/* Image drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleImageDrop}
            className="border-2 border-dashed border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--brand)]/50 transition-colors"
          >
            {form.image_url ? (
              <div className="relative group">
                <img src={form.image_url} alt="" className="w-full max-h-48 object-cover" />
                <button
                  onClick={() => patch('image_url', null)}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-6 cursor-pointer text-[var(--text-muted)]">
                <ImageIcon className="w-8 h-8" />
                <p className="text-xs">Drop an image here</p>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Description & Notes</p>
            <textarea
              value={form.content ?? ''}
              onChange={(e) => patch('content', e.target.value)}
              placeholder="Handout text, descriptions, clues..."
              rows={6}
              className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)] resize-none"
            />
          </div>

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={() => patch('visible_to_players', !form.visible_to_players)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              form.visible_to_players
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)]'
            }`}
          >
            {form.visible_to_players ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {form.visible_to_players ? 'Visible to all players' : 'GM only (hidden from players)'}
          </button>
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
            Save Handout
          </button>
        </div>
      </div>
    </div>
  );
}
