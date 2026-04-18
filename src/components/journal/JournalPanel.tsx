'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, ChevronDown, ChevronRight, User, FileText, Loader2, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { createCharacter, updateCharacter, deleteCharacter, createHandout, updateHandout, deleteHandout } from '@/lib/actions/journal';
import type { JournalCharacter, JournalHandout } from '@/lib/actions/journal';
import { CharacterModal } from './CharacterModal';
import { HandoutModal } from './HandoutModal';

interface Props {
  realmId: string;
  isNarrator: boolean;
  initialCharacters: JournalCharacter[];
  initialHandouts: JournalHandout[];
}

type Section = 'characters' | 'handouts';

export function JournalPanel({ realmId, isNarrator, initialCharacters, initialHandouts }: Props) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [handouts, setHandouts] = useState(initialHandouts);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<Section, boolean>>({ characters: true, handouts: true });
  const [editChar, setEditChar] = useState<JournalCharacter | null>(null);
  const [editHandout, setEditHandout] = useState<JournalHandout | null>(null);
  const [newChar, setNewChar] = useState(false);
  const [newHandout, setNewHandout] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = query.toLowerCase();
  const filteredChars = characters.filter((c) => c.name.toLowerCase().includes(q));
  const filteredHandouts = handouts.filter((h) => h.name.toLowerCase().includes(q));

  const toggleSection = (s: Section) => setOpen((prev) => ({ ...prev, [s]: !prev[s] }));

  const handleSaveChar = useCallback(async (data: Partial<JournalCharacter>) => {
    setSaving(true);
    if (editChar) {
      await updateCharacter(editChar.id, realmId, data);
      setCharacters((prev) => prev.map((c) => c.id === editChar.id ? { ...c, ...data } : c));
      setEditChar(null);
    } else {
      const result = await createCharacter(realmId, data);
      if (result.id) {
        setCharacters((prev) => [...prev, { ...data, id: result.id!, realm_id: realmId, user_id: '', created_at: new Date().toISOString(), tags: [], player_user_ids: [], is_npc: false } as JournalCharacter]);
      }
      setNewChar(false);
    }
    setSaving(false);
  }, [editChar, realmId]);

  const handleDeleteChar = useCallback(async (id: string) => {
    if (!confirm('Delete character?')) return;
    await deleteCharacter(id, realmId);
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, [realmId]);

  const handleSaveHandout = useCallback(async (data: Partial<JournalHandout>) => {
    setSaving(true);
    if (editHandout) {
      await updateHandout(editHandout.id, realmId, data);
      setHandouts((prev) => prev.map((h) => h.id === editHandout.id ? { ...h, ...data } : h));
      setEditHandout(null);
    } else {
      const result = await createHandout(realmId, data);
      if (result.id) {
        setHandouts((prev) => [...prev, { ...data, id: result.id!, realm_id: realmId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), tags: [], player_user_ids: [], visible_to_players: false } as JournalHandout]);
      }
      setNewHandout(false);
    }
    setSaving(false);
  }, [editHandout, realmId]);

  const handleDeleteHandout = useCallback(async (id: string) => {
    if (!confirm('Delete handout?')) return;
    await deleteHandout(id, realmId);
    setHandouts((prev) => prev.filter((h) => h.id !== id));
  }, [realmId]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Search */}
      <div className="px-3 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 bg-[var(--bg-primary)] rounded-md px-2 py-1.5 border border-[var(--border)]">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
        </div>
        {isNarrator && (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setNewChar(true)}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 bg-[var(--bg-modifier-hover)] hover:bg-[var(--brand-dim)] text-[var(--text-secondary)] hover:text-[var(--brand)] rounded border border-[var(--border)] transition-colors"
            >
              <Plus className="w-3 h-3" /> Character
            </button>
            <button
              onClick={() => setNewHandout(true)}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] py-1.5 bg-[var(--bg-modifier-hover)] hover:bg-[var(--brand-dim)] text-[var(--text-secondary)] hover:text-[var(--brand)] rounded border border-[var(--border)] transition-colors"
            >
              <Plus className="w-3 h-3" /> Handout
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Characters */}
        <SectionHeader
          label="Characters"
          count={filteredChars.length}
          open={open.characters}
          onToggle={() => toggleSection('characters')}
        />
        <AnimatePresence initial={false}>
          {open.characters && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              {filteredChars.map((char) => (
                <CharacterRow
                  key={char.id}
                  char={char}
                  isNarrator={isNarrator}
                  onEdit={() => setEditChar(char)}
                  onDelete={() => handleDeleteChar(char.id)}
                />
              ))}
              {filteredChars.length === 0 && (
                <p className="text-[10px] text-[var(--text-muted)] px-4 py-2">No characters yet.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Handouts */}
        <SectionHeader
          label="Handouts"
          count={filteredHandouts.length}
          open={open.handouts}
          onToggle={() => toggleSection('handouts')}
        />
        <AnimatePresence initial={false}>
          {open.handouts && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              {filteredHandouts.map((h) => (
                <HandoutRow
                  key={h.id}
                  handout={h}
                  isNarrator={isNarrator}
                  onEdit={() => setEditHandout(h)}
                  onDelete={() => handleDeleteHandout(h.id)}
                />
              ))}
              {filteredHandouts.length === 0 && (
                <p className="text-[10px] text-[var(--text-muted)] px-4 py-2">No handouts yet.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      {(newChar || editChar) && (
        <CharacterModal
          initial={editChar ?? undefined}
          saving={saving}
          onSave={handleSaveChar}
          onClose={() => { setNewChar(false); setEditChar(null); }}
        />
      )}
      {(newHandout || editHandout) && (
        <HandoutModal
          initial={editHandout ?? undefined}
          saving={saving}
          onSave={handleSaveHandout}
          onClose={() => { setNewHandout(false); setEditHandout(null); }}
        />
      )}
    </div>
  );
}

function SectionHeader({ label, count, open, onToggle }: { label: string; count: number; open: boolean; onToggle: () => void }) {
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 w-full px-3 py-1.5 hover:bg-[var(--bg-modifier-hover)] transition-colors"
    >
      <Icon className="w-3 h-3 text-[var(--text-muted)]" />
      <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
      <span className="ml-1 text-[10px] text-[var(--text-muted)]">{count}</span>
    </button>
  );
}

function CharacterRow({ char, isNarrator, onEdit, onDelete }: { char: JournalCharacter; isNarrator: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-2 px-4 py-1.5 hover:bg-[var(--bg-modifier-hover)] transition-colors">
      <div className="w-6 h-6 rounded-full bg-[var(--bg-floating)] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {char.avatar_url
          ? <img src={char.avatar_url} alt="" className="w-full h-full object-cover" />
          : <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-primary)] truncate">{char.name}</p>
        {char.class && <p className="text-[10px] text-[var(--text-muted)] truncate">{char.class}{char.level > 1 ? ` · Lv ${char.level}` : ''}</p>}
      </div>
      {isNarrator && (
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
          <button onClick={onEdit} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Pencil className="w-3 h-3" /></button>
          <button onClick={onDelete} className="p-1 text-[var(--text-muted)] hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

function HandoutRow({ handout, isNarrator, onEdit, onDelete }: { handout: JournalHandout; isNarrator: boolean; onEdit: () => void; onDelete: () => void }) {
  const VisIcon = handout.visible_to_players ? Eye : EyeOff;
  return (
    <div className="group flex items-center gap-2 px-4 py-1.5 hover:bg-[var(--bg-modifier-hover)] transition-colors">
      <FileText className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-primary)] truncate">{handout.name}</p>
      </div>
      <span title={handout.visible_to_players ? 'Visible to players' : 'GM only'}><VisIcon className="w-3 h-3 text-[var(--text-muted)]" /></span>
      {isNarrator && (
        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
          <button onClick={onEdit} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Pencil className="w-3 h-3" /></button>
          <button onClick={onDelete} className="p-1 text-[var(--text-muted)] hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}
