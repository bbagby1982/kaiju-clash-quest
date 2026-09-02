import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

/**
 * POST /api/voice — ElevenLabs speech and monster roars for the game.
 *
 *   { kind: 'speech', text, voice: 'narrator'|'godzilla'|'announcer'|'gamer'|'theatre' }
 *   { kind: 'roar',   prompt }                      → a generated sound effect
 *   { kind: 'voices' }                              → the voice manifest, free, no audio
 *
 * Returns audio/mpeg bytes (headers X-Voice-Id, X-Cache: HIT|MISS, X-Fell-Back) or JSON
 * on error: 503 when ELEVENLABS_KEY is missing (the client mutes itself for the session),
 * 429 over the daily cap, 502 upstream failure.
 *
 * Every clip is cached in the "voice-cache" blob store by (voice id, settings, text), so a
 * line the game repeats — "FIGHT!", a victory quote, a monster's roar — is paid for once.
 *
 * VOICE CAST. The defaults are the voices Bobbie designed in her own ElevenLabs account for
 * Family-HQ (netlify/functions/read-list.js there): the same "massive evil ogre" Godzilla,
 * the Quest narrator, the Gamer commentator and the Theatre voice, so the game sounds like
 * the rest of the family's apps. Override any of them in Netlify without a deploy:
 *   ELEVENLABS_VOICE_GODZILLA · ELEVENLABS_VOICE_NARRATOR · ELEVENLABS_VOICE_ANNOUNCER
 *   ELEVENLABS_VOICE_GAMER · ELEVENLABS_VOICE_THEATRE · ELEVENLABS_VOICE_FALLBACK
 * Same live finding as Family-HQ (2026-08-28): on the ElevenLabs FREE tier library voices
 * return 402, so a voice problem retries ONCE on the fallback id measured to work there.
 */

const MAX_TEXT = 500;
const MAX_PROMPT = 200;
const DAILY_CAP = 150;               // clips per client per day (cache hits are free and uncounted)
const TTS_TIMEOUT_MS = 25000;
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const MODEL_ID = "eleven_turbo_v2_5";

interface VoiceSpec { voice: string; settings: { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean } }

const env = (k: string) => Netlify.env.get(k) || undefined;

/** Built per request so env overrides are read live (and so importing this module needs no globals). */
function buildCast(): Record<string, VoiceSpec> { return {
  // ⭐ OWNER-CAST VOICE, 2026-09-02 — the Godzilla voice the owner picked for the GAME
  // ("fJmSoZVxiWuuypwIZMZa - one godzilla voice"). Not a premade; do not revert it. Family-HQ's
  // read-aloud Godzilla (grzhtCJj8HQUDc9xfEIs) stays over there — the two are cast separately.
  godzilla:  { voice: env("ELEVENLABS_VOICE_GODZILLA")  || "fJmSoZVxiWuuypwIZMZa", settings: { stability: 0.35, similarity_boost: 0.80, style: 0.50, use_speaker_boost: true } },
  // Quest narrator — grave, storytelling, a little ominous. The battle captions.
  narrator:  { voice: env("ELEVENLABS_VOICE_NARRATOR")  || "si0svtk05vPEuvwAW93c", settings: { stability: 0.50, similarity_boost: 0.80, style: 0.50, use_speaker_boost: true } },
  // Gamer commentator — quick, punchy. "FIGHT!", "K.O.!", round calls.
  announcer: { voice: env("ELEVENLABS_VOICE_ANNOUNCER") || "W3C2vBPukr5b5jvoXhPK", settings: { stability: 0.38, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true } },
  gamer:     { voice: env("ELEVENLABS_VOICE_GAMER")     || "W3C2vBPukr5b5jvoXhPK", settings: { stability: 0.38, similarity_boost: 0.80, style: 0.55, use_speaker_boost: true } },
  theatre:   { voice: env("ELEVENLABS_VOICE_THEATRE")   || "FF7KdobWPaiR0vkcALHF", settings: { stability: 0.36, similarity_boost: 0.80, style: 0.58, use_speaker_boost: true } },
}; }
const FALLBACK_VOICE = () => env("ELEVENLABS_VOICE_FALLBACK") || "pNInz6obpgDQGcFmaJgB";

function castEntry(key: string): VoiceSpec {
  const CAST = buildCast();
  return Object.prototype.hasOwnProperty.call(CAST, key) && CAST[key]?.voice ? CAST[key] : CAST.narrator;
}

const VOICE_NOT_FOUND = /voice_not_found|voice_does_not_exist|voice_not_available|invalid_voice_id|voice[_ ]?id[^"']{0,60}?not\s+(?:be\s+)?found/i;
function looksLikeVoiceProblem(status: number, detail: string): boolean {
  if (status === 402 || /payment_required/i.test(detail)) return true;
  if (status !== 400 && status !== 404) return false;
  return VOICE_NOT_FOUND.test(detail);
}

const sha = (s: string) => createHash("sha1").update(s).digest("hex");
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

async function overDailyCap(context: Context): Promise<boolean> {
  try {
    const ip = (context as { ip?: string }).ip || "unknown";
    const day = new Date().toISOString().slice(0, 10);
    const store = getStore("voice-quota");
    const key = `${day}:${sha(ip).slice(0, 16)}`;
    const current = Number((await store.get(key, { type: "text" })) || 0);
    if (current >= DAILY_CAP) return true;
    await store.set(key, String(current + 1), { metadata: { day } });
    return false;
  } catch {
    return false; // fail open — a broken counter must not silence the game
  }
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400); }
  const kind = String(body.kind || "speech");

  if (kind === "voices") {
    const CAST = buildCast();
    const voices: Record<string, string> = {};
    for (const k of Object.keys(CAST)) voices[k] = CAST[k].voice;
    voices._fallback = FALLBACK_VOICE();
    return json({ voices, configured: !!(env("ELEVENLABS_KEY") || env("ELEVENLABS_API_KEY")) });
  }

  const KEY = env("ELEVENLABS_KEY") || env("ELEVENLABS_API_KEY");
  if (!KEY) return json({ error: "Voices not configured (ELEVENLABS_KEY missing on this Netlify site)" }, 503);

  const cache = getStore("voice-cache");

  // ── Build the request + cache key ─────────────────────────────────────────
  let cacheKey: string;
  let upstream: () => Promise<Response>;
  let fallback: (() => Promise<Response>) | null = null;
  let voiceId = "";

  if (kind === "roar") {
    const prompt = String(body.prompt || "").trim().slice(0, MAX_PROMPT);
    if (!prompt) return json({ error: "prompt required" }, 400);
    cacheKey = "sfx-" + sha(prompt.toLowerCase());
    voiceId = "sound-effect";
    upstream = () => fetchWithTimeout("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text: prompt, duration_seconds: 3, prompt_influence: 0.5 }),
    }, TTS_TIMEOUT_MS);
  } else {
    const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    if (!text) return json({ error: "text required" }, 400);
    const role = String(body.voice || "narrator").toLowerCase();
    const spec = castEntry(role);
    voiceId = spec.voice;
    cacheKey = "tts-" + sha(`${spec.voice}|${JSON.stringify(spec.settings)}|${MODEL_ID}|${text}`);
    const speak = (v: VoiceSpec) => fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(v.voice)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: v.settings }),
    }, TTS_TIMEOUT_MS);
    upstream = () => speak(spec);
    if (spec.voice !== FALLBACK_VOICE()) fallback = () => speak({ voice: FALLBACK_VOICE(), settings: spec.settings });
  }

  // ── Cache hit: free ───────────────────────────────────────────────────────
  try {
    const hit = await cache.getWithMetadata(cacheKey, { type: "arrayBuffer" });
    if (hit?.data && hit.data.byteLength > 0) {
      return new Response(hit.data, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400", "X-Cache": "HIT", "X-Voice-Id": String(hit.metadata?.voiceId || voiceId) } });
    }
  } catch { /* cache miss or store error — generate */ }

  if (await overDailyCap(context)) return json({ error: "Daily voice limit reached — the monsters need to rest their throats until tomorrow." }, 429);

  // ── Generate ─────────────────────────────────────────────────────────────
  try {
    let resp = await upstream();
    let fellBack = false;
    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.text()).slice(0, 300); } catch { /* ignore */ }
      console.error("[voice] elevenlabs", resp.status, detail);
      if (fallback && looksLikeVoiceProblem(resp.status, detail)) {
        fellBack = true;
        voiceId = FALLBACK_VOICE();
        resp = await fallback();
        if (!resp.ok) {
          let d2 = "";
          try { d2 = (await resp.text()).slice(0, 300); } catch { /* ignore */ }
          return json({ error: "voice failed", status: resp.status, detail: d2 }, resp.status === 429 ? 429 : 502);
        }
      } else {
        return json({ error: "voice failed", status: resp.status, detail }, resp.status === 429 ? 429 : 502);
      }
    }
    const buf = await resp.arrayBuffer();
    if (!buf.byteLength) return json({ error: "empty audio" }, 502);
    if (buf.byteLength > MAX_AUDIO_BYTES) return json({ error: "audio too large" }, 502);

    // A fallback clip is deliberately NOT cached under the real voice's key: when the plan
    // is upgraded (or the voice fixed) the next request regenerates in the intended voice.
    if (!fellBack) {
      try { await cache.set(cacheKey, new Blob([buf], { type: "audio/mpeg" }), { metadata: { voiceId, createdAt: new Date().toISOString(), kind } }); } catch { /* ignore */ }
    }
    return new Response(buf, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400", "X-Cache": "MISS", "X-Voice-Id": voiceId, ...(fellBack ? { "X-Fell-Back": "1" } : {}) } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[voice] error", message);
    return json({ error: "voice error", detail: message.slice(0, 200) }, 502);
  }
};

export const config: Config = {
  path: "/api/voice",
};
