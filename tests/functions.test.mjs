// Executable proof for the Netlify functions — run with `npm test`.
// Each .mts is bundled by esbuild with @netlify/blobs swapped for the in-memory fake.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, 'node_modules', '.cache', 'fn-tests');
fs.rmSync(outdir, { recursive: true, force: true });
const names = ['roster', 'monster-image', 'upload-monster-image', 'monsters-admin', 'cloud-save', 'battle', 'voice'];
await build({
  entryPoints: names.map((n) => path.join(root, 'netlify/functions', `${n}.mts`)),
  bundle: true, format: 'esm', platform: 'node', outdir, logLevel: 'silent',
  external: ['@anthropic-ai/sdk'],
  // One shared in-memory store for every function: resolve @netlify/blobs to the fake
  // as an EXTERNAL import, so esbuild does not inline a private copy into each bundle.
  plugins: [{ name: 'fake-blobs', setup(b) { b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: path.join(root, 'tests/fakes/netlify-blobs.mjs'), external: true })); } }],
  outExtension: { '.js': '.mjs' },
});
const fake = await import(path.join(root, 'tests/fakes/netlify-blobs.mjs'));
const fn = {};
for (const n of names) fn[n] = (await import(path.join(outdir, `${n}.mjs`))).default;

const env = new Map();
globalThis.Netlify = { env: { get: (k) => env.get(k) } };
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const call = (handler, method, url, { body, headers } = {}) =>
  handler(new Request(`https://game.test${url}`, { method, headers: { 'content-type': 'application/json', ...(headers || {}) }, body: body === undefined ? undefined : JSON.stringify(body) }), {});
const json = async (res) => ({ status: res.status, body: await res.json() });

const PNG_1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const pngDataUrl = `data:image/png;base64,${PNG_1x1}`;

// ── Admin gate ────────────────────────────────────────────────────────────
fake.__reset(); env.clear();
{
  const r = await json(await call(fn['upload-monster-image'], 'POST', '/api/admin/upload-monster-image', { body: { monsterId: 'sockzilla', dataUrl: pngDataUrl }, headers: { 'x-admin-key': 'anything' } }));
  ok(r.status === 503 && /ADMIN_KEY/.test(r.body.error), 'no ADMIN_KEY configured → 503 with the fix in the message (never an open upload)');
  env.set('ADMIN_KEY', 'family-secret');
  const wrong = await json(await call(fn['upload-monster-image'], 'POST', '/api/admin/upload-monster-image', { body: { monsterId: 'sockzilla', dataUrl: pngDataUrl }, headers: { 'x-admin-key': 'nope' } }));
  ok(wrong.status === 401, 'wrong key → 401');
  const none = await json(await call(fn['upload-monster-image'], 'POST', '/api/admin/upload-monster-image', { body: { monsterId: 'sockzilla', dataUrl: pngDataUrl } }));
  ok(none.status === 401, 'missing key → 401');
}

// ── Upload + serve + roster ──────────────────────────────────────────────
{
  const up = await json(await call(fn['upload-monster-image'], 'POST', '/api/admin/upload-monster-image', { body: { monsterId: 'Sockzilla', dataUrl: pngDataUrl }, headers: { 'x-admin-key': 'family-secret' } }));
  ok(up.status === 200 && up.body.results[0].status === 'success' && up.body.results[0].monsterId === 'sockzilla', 'dataUrl upload succeeds and lower-cases the id');
  ok(up.body.results[0].contentType === 'image/png', 'content type recorded');
  const bad = await json(await call(fn['upload-monster-image'], 'POST', '/api/admin/upload-monster-image', { body: { images: [{ monsterId: '../etc', dataUrl: pngDataUrl }, { monsterId: 'x', dataUrl: 'data:text/plain;base64,aGk=' }, { monsterId: 'y', imageUrl: 'http://insecure' }, { monsterId: 'z' }] }, headers: { 'x-admin-key': 'family-secret' } }));
  ok(bad.body.results.every((r) => r.status !== 'success'), 'bad id / non-image / http url / missing all rejected');
  const big = await json(await call(fn['upload-monster-image'], 'POST', '/api/admin/upload-monster-image', { body: { monsterId: 'huge', dataUrl: 'data:image/png;base64,' + Buffer.alloc(5 * 1024 * 1024 + 10).toString('base64') }, headers: { 'x-admin-key': 'family-secret' } }));
  ok(/too large/.test(big.body.results[0].status), 'over 5 MB rejected with a hint');

  const img = await fn['monster-image'](new Request('https://game.test/api/monster-image/sockzilla?v=abc'), {});
  ok(img.status === 200 && img.headers.get('content-type') === 'image/png' && (await img.arrayBuffer()).byteLength === Buffer.from(PNG_1x1, 'base64').length, 'image served with its content type');
  const head = await fn['monster-image'](new Request('https://game.test/api/monster-image/sockzilla', { method: 'HEAD' }), {});
  ok(head.status === 200, 'HEAD works for the admin gallery');
  const missing = await fn['monster-image'](new Request('https://game.test/api/monster-image/terramoth'), {});
  ok(missing.status === 404, 'unknown id → 404');
  const evil = await fn['monster-image'](new Request('https://game.test/api/monster-image/..%2Fx'), {});
  ok(evil.status === 400, 'path traversal id → 400');
  const malformed = await fn['monster-image'](new Request('https://game.test/api/monster-image/%E0%A4%A'), {});
  ok(malformed.status === 400, 'malformed percent-encoding → 400, not a 500 from decodeURIComponent throwing');

  const roster = await json(await call(fn.roster, 'GET', '/api/roster'));
  ok(roster.status === 200 && typeof roster.body.art.sockzilla === 'string' && roster.body.custom.length === 0, 'roster lists uploaded art with a version token');

  const del = await json(await call(fn['upload-monster-image'], 'DELETE', '/api/admin/upload-monster-image?id=sockzilla', { headers: { 'x-admin-key': 'family-secret' } }));
  ok(del.status === 200, 'delete art');
  const roster2 = await json(await call(fn.roster, 'GET', '/api/roster'));
  ok(!('sockzilla' in roster2.body.art), 'deleted art leaves the roster');
}

// ── Custom monsters ──────────────────────────────────────────────────────
{
  const create = await json(await call(fn['monsters-admin'], 'POST', '/api/admin/monsters', { headers: { 'x-admin-key': 'family-secret' }, body: {
    id: 'Lava Rex!!', name: 'Lava Rex', title: 'The Molten Tyrant', stats: { speed: 500, strength: -3, defense: 'x', specialAttack: 77 },
    specialAbility: { name: 'Magma Bite', type: 'laser' }, rarity: 'mythic', terrainBonus: ['volcano', 'moon'], funFacts: ['a', '', 'b'], facing: 'left', custom: false, evil: '<script>' } }));
  ok(create.status === 400, 'id with spaces/punctuation rejected');
  const create2 = await json(await call(fn['monsters-admin'], 'POST', '/api/admin/monsters', { headers: { 'x-admin-key': 'family-secret' }, body: {
    id: 'lava-rex', name: 'Lava Rex', title: 'The Molten Tyrant', stats: { speed: 500, strength: -3, defense: 'x', specialAttack: 77 },
    specialAbility: { name: 'Magma Bite', type: 'laser' }, rarity: 'mythic', terrainBonus: ['volcano', 'moon'], funFacts: ['a', '', 'b'], facing: 'left', custom: false, evil: '<script>' } }));
  ok(create2.status === 200, 'valid custom monster saved');
  const m = create2.body.monster;
  ok(m.stats.speed === 100 && m.stats.strength === 1 && m.stats.defense === 60 && m.stats.specialAttack === 77, 'stats clamped / defaulted');
  ok(m.specialAbility.type === 'beam' && m.rarity === 'rare', 'unknown ability type / rarity fall back');
  ok(m.terrainBonus.length === 1 && m.terrainBonus[0] === 'volcano', 'unknown terrain dropped');
  ok(m.funFacts.length === 2 && m.facing === 'left' && m.custom === true && !('evil' in m), 'lists cleaned, facing kept, custom forced, junk dropped');
  const list = await json(await call(fn['monsters-admin'], 'GET', '/api/admin/monsters'));
  ok(list.status === 200 && list.body.monsters.length === 1, 'public list returns the custom monster');
  const roster = await json(await call(fn.roster, 'GET', '/api/roster'));
  ok(roster.body.custom.length === 1 && roster.body.custom[0].id === 'lava-rex', 'roster carries custom monsters');
  const noKey = await json(await call(fn['monsters-admin'], 'DELETE', '/api/admin/monsters?id=lava-rex'));
  ok(noKey.status === 401, 'delete needs the key');
  const del = await json(await call(fn['monsters-admin'], 'DELETE', '/api/admin/monsters?id=lava-rex', { headers: { 'x-admin-key': 'family-secret' } }));
  ok(del.status === 200 && (await json(await call(fn['monsters-admin'], 'GET', '/api/admin/monsters'))).body.monsters.length === 0, 'delete removes it');
}

// ── Cloud save ───────────────────────────────────────────────────────────
{
  const progress = { unlockedMonsters: ['showa-godzilla'], totalBattles: 3, totalRaces: 1, wins: 2 };
  const nf = await json(await call(fn['cloud-save'], 'GET', '/api/cloud-save?player=Alfred&code=roar'));
  ok(nf.status === 404 && nf.body.code === 'NOT_FOUND', 'unknown player → NOT_FOUND');
  const save = await json(await call(fn['cloud-save'], 'POST', '/api/cloud-save', { body: { playerName: 'Alfred', secretCode: 'roar', progress, device: 'iPad' } }));
  ok(save.status === 200 && save.body.success && typeof save.body.lastSaved === 'string', 'save works');
  const load = await json(await call(fn['cloud-save'], 'GET', '/api/cloud-save?player=alfred&code=roar'));
  ok(load.status === 200 && load.body.progress.totalBattles === 3 && load.body.savedFrom === 'iPad', 'load is case-insensitive on the name and returns the device');
  const wrong = await json(await call(fn['cloud-save'], 'GET', '/api/cloud-save?player=alfred&code=nope'));
  ok(wrong.status === 403 && wrong.body.code === 'WRONG_CODE', 'wrong code → WRONG_CODE');
  const taken = await json(await call(fn['cloud-save'], 'POST', '/api/cloud-save', { body: { playerName: 'Alfred', secretCode: 'other', progress } }));
  ok(taken.status === 409 && taken.body.code === 'NAME_TAKEN', 'another code on the same name → NAME_TAKEN');
}

// ── Narrator ─────────────────────────────────────────────────────────────
{
  env.delete('ANTHROPIC_API_KEY');
  const r = await json(await call(fn.battle, 'POST', '/api/battle', { body: { phase: 'intro', player: { name: 'A' }, opponent: { name: 'B' }, map: { name: 'Tokyo' } } }));
  ok(r.status === 503, 'no API key → 503 fast, the client keeps its local caption');
  const bad = await json(await call(fn.battle, 'POST', '/api/battle', { body: { phase: 'intro' } }));
  ok(bad.status === 503 || bad.status === 400, 'missing fighters rejected');
}

// ── Voice (ElevenLabs) ───────────────────────────────────────────────────
{
  const realFetch = globalThis.fetch;
  const calls = [];
  const mp3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21]);
  let mode = 'ok';
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    if (mode === '402' && !String(url).includes('pNInz6obpgDQGcFmaJgB')) return new Response('{"detail":{"status":"payment_required"}}', { status: 402 });
    if (mode === '500') return new Response('boom', { status: 500 });
    return new Response(mp3, { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  };
  const ctx = { ip: '1.2.3.4' };
  const voice = (body) => fn.voice(new Request('https://game.test/api/voice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), ctx);

  env.delete('ELEVENLABS_KEY');
  const manifest = await (await voice({ kind: 'voices' })).json();
  ok(manifest.voices.godzilla === 'fJmSoZVxiWuuypwIZMZa' && manifest.voices.godzilla2 === 'Ducd71NdsHmshEfzo7mz' && manifest.configured === false, "voice manifest lists both owner Godzilla voices and reports no key");
  ok((await voice({ kind: 'speech', text: 'ROAR', voice: 'godzilla' })).status === 503, 'no key → 503 (client mutes itself)');

  env.set('ELEVENLABS_KEY', 'xi-test');
  env.set('ELEVENLABS_VOICE_ANNOUNCER', 'custom-announcer-id');
  const r1 = await voice({ kind: 'speech', text: 'FIGHT!', voice: 'announcer' });
  ok(r1.status === 200 && r1.headers.get('content-type') === 'audio/mpeg' && r1.headers.get('x-cache') === 'MISS' && r1.headers.get('x-voice-id') === 'custom-announcer-id', 'speech generated on the env-overridden voice');
  ok(calls.at(-1).url.includes('custom-announcer-id') && calls.at(-1).body.text === 'FIGHT!' && calls.at(-1).body.model_id === 'eleven_turbo_v2_5', 'ElevenLabs called with the right voice/model/text');
  const before = calls.length;
  const r2 = await voice({ kind: 'speech', text: 'FIGHT!', voice: 'announcer' });
  ok(r2.status === 200 && r2.headers.get('x-cache') === 'HIT' && calls.length === before, 'same line again is a cache HIT with no upstream call');
  ok((await voice({ kind: 'speech', text: '   ', voice: 'godzilla' })).status === 400, 'empty text rejected');

  mode = '402';
  const r3 = await voice({ kind: 'speech', text: 'I am the king of the monsters', voice: 'godzilla' });
  ok(r3.status === 200 && r3.headers.get('x-fell-back') === '1' && r3.headers.get('x-voice-id') === 'pNInz6obpgDQGcFmaJgB', '402 on a library voice retries once on the fallback voice');
  const r3b = await voice({ kind: 'speech', text: 'I am the king of the monsters', voice: 'godzilla' });
  ok(r3b.headers.get('x-cache') === 'MISS', 'a fallback clip is never cached under the real voice');
  mode = '500';
  ok((await voice({ kind: 'speech', text: 'new line', voice: 'narrator' })).status === 502, 'upstream 500 → 502, no retry');
  ok(calls.filter((c) => c.body.text === 'new line').length === 1, 'non-voice errors are not retried');

  mode = 'ok';
  const roar1 = await voice({ kind: 'roar', prompt: 'deep thunderous giant kaiju roar' });
  ok(roar1.status === 200 && calls.at(-1).url.endsWith('/v1/sound-generation') && calls.at(-1).body.duration_seconds === 3, 'roar uses the sound-effects endpoint');
  const roar2 = await voice({ kind: 'roar', prompt: 'DEEP thunderous giant KAIJU roar' });
  ok(roar2.headers.get('x-cache') === 'HIT', 'roar prompts are cached case-insensitively');

  const capCalls = calls.length;
  let limited = 0;
  for (let i = 0; i < 160; i++) { const r = await voice({ kind: 'speech', text: `line ${i}`, voice: 'narrator' }); if (r.status === 429) limited++; }
  ok(limited > 0 && calls.length - capCalls <= 150, `daily cap kicks in (${limited} limited, ${calls.length - capCalls} generated)`);

  globalThis.fetch = realFetch;
}

console.log(`functions: ${checks} checks passed`);
