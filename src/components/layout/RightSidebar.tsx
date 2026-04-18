'use client';

import { useState } from 'react';
import { BookOpen, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { CoMasterPanel } from '@/components/ai/CoMasterPanel';
import type { JournalCharacter, JournalHandout } from '@/lib/actions/journal';

interface Props {
  realmId: string;
  realmSystem: string | null;
  isNarrator: boolean;
  initialCharacters: JournalCharacter[];
  initialHandouts: JournalHandout[];
}

type Tab = 'journal' | 'comaster';

export function RightSidebar({ realmId, realmSystem, isNarrator, initialCharacters, initialHandouts }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('journal');

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-10 bg-[var(--bg-secondary)] border-l border-[var(--border)] py-2 gap-2 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Expand"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setTab('journal'); setCollapsed(false); }}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
          title="Journal"
        >
          <BookOpen className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setTab('comaster'); setCollapsed(false); }}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors"
          title="AI Co-Master"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-72 bg-[var(--bg-secondary)] border-l border-[var(--border)] flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-[var(--border)] flex-shrink-0">
        <button
          onClick={() => setTab('journal')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'journal'
              ? 'border-[var(--brand)] text-[var(--brand)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Journal
        </button>
        <button
          onClick={() => setTab('comaster')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === 'comaster'
              ? 'border-[var(--brand)] text-[var(--brand)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Co-Master
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
          title="Collapse"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'journal' && (
          <JournalPanel
            realmId={realmId}
            isNarrator={isNarrator}
            initialCharacters={initialCharacters}
            initialHandouts={initialHandouts}
          />
        )}
        {tab === 'comaster' && (
          <CoMasterPanel
            realmId={realmId}
            realmSystem={realmSystem}
            isNarrator={isNarrator}
          />
        )}

      </div>
    </div>
  );
}
