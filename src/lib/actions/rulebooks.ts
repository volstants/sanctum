'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { GoogleGenAI } from '@google/genai';
import { revalidatePath } from 'next/cache';
import type { Rulebook } from '@/types';

const EXTRACTION_PROMPT = `You are extracting mechanical rules from an RPG rulebook PDF.

Extract ALL game mechanics including:
- Character and creature stat block format (exact field names and order)
- Attribute/ability score names, ranges, and what they control
- HP/Health point calculation methods and typical ranges per level/tier
- Armor Class / Defense calculation
- Attack roll format and damage notation
- Skill list and how checks work
- Saving throw types
- Condition/status effect list and their mechanical effects
- Challenge Rating / Difficulty / Level equivalents and what they mean
- Movement and speed rules
- Action economy (actions, bonus actions, reactions, etc.)
- Special ability categories and formatting conventions
- Spell/ability level system if applicable
- Any other core mechanical rules

Output structured plain text. Be exhaustive — include all numeric ranges, formulas, and examples from the book. Do NOT summarize or abbreviate rules. The output will be used as the sole source of truth for an AI game assistant.`;

export async function uploadRulebook(realmId: string, formData: FormData): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const service = createServiceClient();

  // Verify narrator
  const { data: membership } = await service
    .from('realm_members')
    .select('role')
    .eq('realm_id', realmId)
    .eq('user_id', user.id)
    .single();

  if (membership?.role !== 'narrator') return { error: 'Only narrators can upload rulebooks' };

  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No file provided' };
  if (file.type !== 'application/pdf') return { error: 'Only PDF files are allowed' };
  if (file.size > 50 * 1024 * 1024) return { error: 'File too large (max 50MB)' };

  const name = (formData.get('name') as string)?.trim() || file.name.replace('.pdf', '');
  const storagePath = `${realmId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;

  // Upload to Supabase Storage
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await service.storage
    .from('rulebooks')
    .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false });

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  // Insert record as 'processing'
  const { data: record, error: insertError } = await service
    .from('rulebooks')
    .insert({
      realm_id: realmId,
      name,
      storage_path: storagePath,
      file_size: file.size,
      status: 'processing',
    })
    .select()
    .single();

  if (insertError) return { error: insertError.message };

  // Extract rules via Gemini (async in same request — Gemini is fast enough for this)
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'placeholder') throw new Error('GEMINI_API_KEY not configured');

    const ai = new GoogleGenAI({ apiKey });
    const base64 = Buffer.from(bytes).toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const extractedText = response.text ?? '';

    await service
      .from('rulebooks')
      .update({ extracted_text: extractedText, status: 'ready' })
      .eq('id', record.id);
  } catch (err) {
    await service
      .from('rulebooks')
      .update({ status: 'error', error_message: String(err) })
      .eq('id', record.id);
    // Don't fail the upload — user can see the error in the UI
  }

  revalidatePath(`/app/realm/${realmId}/settings`);
  return { id: record.id };
}

export async function getRulebooks(realmId: string): Promise<Rulebook[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const service = createServiceClient();
  const { data } = await service
    .from('rulebooks')
    .select('*')
    .eq('realm_id', realmId)
    .order('created_at', { ascending: true });

  return (data as Rulebook[]) ?? [];
}

export async function deleteRulebook(id: string, storagePath: string, realmId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const service = createServiceClient();

  const { data: membership } = await service
    .from('realm_members')
    .select('role')
    .eq('realm_id', realmId)
    .eq('user_id', user.id)
    .single();

  if (membership?.role !== 'narrator') return { error: 'Only narrators can delete rulebooks' };

  await service.storage.from('rulebooks').remove([storagePath]);
  await service.from('rulebooks').delete().eq('id', id);

  revalidatePath(`/app/realm/${realmId}/settings`);
  return {};
}

/** Returns concatenated extracted_text for all ready rulebooks in a realm (for AI context) */
export async function getRulebookContext(realmId: string): Promise<string> {
  const service = createServiceClient();
  const { data } = await service
    .from('rulebooks')
    .select('name, extracted_text')
    .eq('realm_id', realmId)
    .eq('status', 'ready');

  if (!data || data.length === 0) return '';

  return data
    .map((r) => `=== ${r.name} ===\n${r.extracted_text ?? ''}`)
    .join('\n\n');
}
