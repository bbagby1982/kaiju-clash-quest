/**
 * Thin fetch wrappers for the two admin write endpoints. Every function returns a
 * plain { ok, message } shape (plus whatever payload) so components can show the
 * server's own error text verbatim — never invent a friendlier message that hides
 * what actually went wrong (a 503 from a missing ADMIN_KEY needs to reach the parent
 * word for word so they know what to fix in Netlify).
 */
import { CustomMonsterInput, Monster } from '@/types/game';

const UPLOAD_URL = '/api/admin/upload-monster-image';
const MONSTERS_URL = '/api/admin/monsters';

export interface UploadItemResult {
  monsterId: string;
  status: string;
  bytes?: number;
  contentType?: string;
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function serverError(res: Response, body: Record<string, unknown> | null): string {
  const fromBody = body && typeof body.error === 'string' ? body.error : null;
  if (fromBody) return fromBody;
  return `Server returned ${res.status} ${res.statusText}`;
}

export type KeyTestOutcome = 'valid' | 'invalid' | 'not-configured' | 'unknown';

export interface KeyTestResult {
  outcome: KeyTestOutcome;
  message: string;
}

/**
 * There's no dedicated "check my key" endpoint, so this POSTs a deliberately empty
 * body to the upload endpoint (the admin gate in netlify/functions/_admin.mts runs
 * BEFORE any body validation) and reads the outcome:
 *   503 — ADMIN_KEY isn't set on Netlify at all
 *   401 — the key is wrong
 *   200 with results[0].status !== "success" — the key was ACCEPTED; the request
 *        only failed per-item validation (no monsterId), which is expected and
 *        harmless for an empty probe body
 */
export async function testAdminKey(adminKey: string): Promise<KeyTestResult> {
  try {
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({}),
    });
    const body = await readJson(res);
    if (res.status === 503) return { outcome: 'not-configured', message: serverError(res, body) };
    if (res.status === 401) return { outcome: 'invalid', message: serverError(res, body) };
    if (res.ok) return { outcome: 'valid', message: 'Key accepted.' };
    return { outcome: 'unknown', message: serverError(res, body) };
  } catch (err) {
    return { outcome: 'unknown', message: err instanceof Error ? err.message : 'Could not reach the server' };
  }
}

export interface UploadResult {
  ok: boolean;
  message: string;
  bytes?: number;
  contentType?: string;
}

async function uploadPayload(adminKey: string, monsterId: string, payload: { dataUrl?: string; imageUrl?: string }): Promise<UploadResult> {
  try {
    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ monsterId, ...payload }),
    });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, message: serverError(res, body) };
    const results = Array.isArray(body?.results) ? (body!.results as UploadItemResult[]) : [];
    const result = results[0];
    if (!result) return { ok: false, message: 'Server did not return a result' };
    if (result.status !== 'success') return { ok: false, message: result.status };
    return { ok: true, message: 'Uploaded', bytes: result.bytes, contentType: result.contentType };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Upload failed' };
  }
}

export function uploadMonsterImageDataUrl(adminKey: string, monsterId: string, dataUrl: string): Promise<UploadResult> {
  return uploadPayload(adminKey, monsterId, { dataUrl });
}

export function uploadMonsterImageUrl(adminKey: string, monsterId: string, imageUrl: string): Promise<UploadResult> {
  return uploadPayload(adminKey, monsterId, { imageUrl });
}

export async function deleteMonsterImage(adminKey: string, monsterId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${UPLOAD_URL}?id=${encodeURIComponent(monsterId)}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, message: serverError(res, body) };
    return { ok: true, message: 'Removed' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export interface SaveMonsterResult {
  ok: boolean;
  message: string;
  monster?: Monster;
}

export async function saveCustomMonster(adminKey: string, monster: CustomMonsterInput): Promise<SaveMonsterResult> {
  try {
    const res = await fetch(MONSTERS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify(monster),
    });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, message: serverError(res, body) };
    return { ok: true, message: 'Saved', monster: body?.monster as Monster | undefined };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function deleteCustomMonster(adminKey: string, id: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${MONSTERS_URL}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    const body = await readJson(res);
    if (!res.ok) return { ok: false, message: serverError(res, body) };
    return { ok: true, message: 'Deleted' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Delete failed' };
  }
}
