'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Trash2, CheckCircle, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { uploadRulebook, deleteRulebook } from '@/lib/actions/rulebooks';
import type { Rulebook } from '@/types';

interface Props {
  realmId: string;
  initialRulebooks: Rulebook[];
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function RulebookManager({ realmId, initialRulebooks }: Props) {
  const [books, setBooks] = useState<Rulebook[]>(initialRulebooks);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', nameRef.current?.value.trim() || file.name.replace('.pdf', ''));

    const result = await uploadRulebook(realmId, fd);
    if (result.error) {
      setError(result.error);
    } else {
      // Optimistically add as processing, will be ready after page refresh
      setBooks((prev) => [...prev, {
        id: result.id!,
        realm_id: realmId,
        name: nameRef.current?.value.trim() || file.name.replace('.pdf', ''),
        storage_path: '',
        extracted_text: null,
        page_count: null,
        file_size: file.size,
        status: 'processing',
        error_message: null,
        created_at: new Date().toISOString(),
      }]);
      if (nameRef.current) nameRef.current.value = '';
    }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') handleUpload(f);
  };

  const handleDelete = async (book: Rulebook) => {
    if (!confirm(`Delete "${book.name}"?`)) return;
    setBooks((prev) => prev.filter((b) => b.id !== book.id));
    await deleteRulebook(book.id, book.storage_path, realmId);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload area */}
      <div className="flex flex-col gap-2">
        <input
          ref={nameRef}
          placeholder="Rulebook name (optional)"
          className="px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand)]"
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors
            ${dragOver
              ? 'border-[var(--brand)] bg-[var(--brand-dim)]'
              : 'border-[var(--border)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg-modifier-hover)]'
            }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-[var(--brand)] animate-spin" />
              <p className="text-sm text-[var(--text-muted)]">Uploading & extracting rules…</p>
              <p className="text-[10px] text-[var(--text-muted)]">Gemini is reading the PDF. This may take 30–60s.</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-[var(--text-muted)]" />
              <p className="text-sm text-[var(--text-primary)] font-semibold">Drop PDF here or click to upload</p>
              <p className="text-[10px] text-[var(--text-muted)]">Max 50MB · PDF only · Rules are extracted automatically</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
      </div>

      {error && (
        <p className="text-[var(--danger)] text-sm flex items-center gap-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {/* Rulebook list */}
      <AnimatePresence initial={false}>
        {books.map((book) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]"
          >
            <FileText className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{book.name}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {formatBytes(book.file_size)}
                {book.page_count ? ` · ${book.page_count} pages` : ''}
              </p>
            </div>
            {book.status === 'processing' && (
              <div className="flex items-center gap-1 text-[var(--brand)] text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting…</span>
              </div>
            )}
            {book.status === 'ready' && (
              <span title="Rules extracted"><CheckCircle className="w-4 h-4 text-green-400" /></span>
            )}
            {book.status === 'error' && (
              <span title={book.error_message ?? 'Error'}><AlertCircle className="w-4 h-4 text-red-400" /></span>
            )}
            <button
              onClick={() => handleDelete(book)}
              className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {books.length === 0 && !uploading && (
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm justify-center py-4">
          <BookOpen className="w-4 h-4" />
          <span>No rulebooks yet. Upload a PDF to get started.</span>
        </div>
      )}
    </div>
  );
}
