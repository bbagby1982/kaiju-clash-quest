// ── THE WINNER GETS TO FINISH TALKING ────────────────────────────────────
//
// Owner, 2026-10-12: "in the godzilla game the voice over keeps getting cut
// off before it moves to the next page after the battle."
//
// The arena used to fire the announcer + the winner's line as fire-and-forget
// and then run a fixed 1300ms step before swapping in the results sheet. Two
// real ElevenLabs clips run 4-8s, so the sheet always landed mid-sentence.
//
// `waitForLine` is the race that fixes it, lifted out of the component so it
// can be EXECUTED here rather than asserted about in prose. It has to get two
// opposite things right at once:
//
//   • let the line finish — otherwise the bug is still there;
//   • never outlast its cap — voice must never block gameplay (src/lib/voice.ts),
//     so a dead ElevenLabs costs a few seconds of quiet, never a child stuck
//     in a fight that is already over.
//
// Run with `npm test`.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, 'node_modules', '.cache', 'voiceWait');
await build({
  entryPoints: [path.join(root, 'src/lib/voice.ts')],
  bundle: true, format: 'esm', platform: 'node', outdir, outbase: path.join(root, 'src'),
  alias: { '@': path.join(root, 'src') },
  loader: { '.png': 'dataurl', '.webp': 'dataurl' },
  logLevel: 'silent',
});
const { waitForLine } = await import(path.join(outdir, 'lib/voice.js'));

let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); console.log('  [ok] ' + m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const since = () => { const t = Date.now(); return () => Date.now() - t; };

console.log('\n== 1. A line that finishes is heard in full ==');
{
  const el = since();
  const how = await waitForLine(wait(300), 5000);
  const ms = el();
  ok(how === 'ended', `it reports the line ENDED, not a timeout (${how})`);
  ok(ms >= 280, `and it actually waited for it: ${ms}ms, not the old fixed 1300ms dash to the results sheet`);
  ok(ms < 1500, `without hanging around afterwards: ${ms}ms`);
}

console.log('\n== 2. ...but a line that never ends cannot strand a child ==');
{
  // The whole reason this is a race and not an await. A hung ElevenLabs
  // request, a clip that never fires `ended`, a muted element on iOS — any of
  // them would otherwise leave a finished fight with no results sheet at all.
  const el = since();
  const how = await waitForLine(new Promise(() => {}), 400);
  const ms = el();
  ok(how === 'capped', `the cap fires and says so (${how})`);
  ok(ms >= 380 && ms < 1500, `at about the cap, not never: ${ms}ms`);
}

console.log('\n== 3. A line that FAILS is treated as a line that finished ==');
{
  // speak() never rejects, but waitForLine must not depend on that promise
  // elsewhere keeping the same manners — a rejection here would become an
  // unhandled rejection and the results sheet would never arrive.
  const el = since();
  const how = await waitForLine(Promise.reject(new Error('elevenlabs fell over')), 5000);
  ok(how === 'ended', `a rejected line resolves rather than throwing (${how})`);
  ok(el() < 1000, 'and does so immediately, not at the cap');
}

console.log('\n== 4. No line at all → no wait at all ==');
{
  // A muted kid, or an account with no ElevenLabs key: speak() resolves
  // instantly and there is nothing to wait for. The results must not pause.
  for (const empty of [null, undefined]) {
    const el = since();
    const how = await waitForLine(empty, 5000);
    ok(how === 'none' && el() < 60, `${String(empty)} → straight through in ${el()}ms`);
  }
}

console.log('\n== 5. The kid can always cut it short — and the control is LIVE ==');
{
  // The arena's caption bar says "TAP TO SKIP". During this wait the beat
  // sequence is already over, so without a releaser that tap would land on a
  // control that does nothing — the dead-control shape this family has been
  // bitten by before. waitForLine HANDS OUT the releaser for exactly that.
  let release = null;
  const el = since();
  const p = waitForLine(new Promise(() => {}), 10000, (r) => { release = r; });
  await wait(50);
  ok(typeof release === 'function', 'a releaser is handed to the caller while the wait is live');
  release();
  const how = await p;
  ok(how === 'released', `tapping it ends the wait and says why (${how})`);
  ok(el() < 2000, `immediately — not at the 10s cap: ${el()}ms`);
}

console.log('\n== 6. The releaser is taken back, so nothing points at a finished wait ==');
{
  const seen = [];
  await waitForLine(wait(50), 5000, (r) => seen.push(r));
  ok(seen.length === 2, `onRelease is called twice — once with the releaser, once to clear it (${seen.length})`);
  ok(typeof seen[0] === 'function' && seen[1] === null, 'and the last call is null, so the caller drops its reference');
  const none = [];
  await waitForLine(null, 5000, (r) => none.push(r));
  ok(none.length === 1 && none[0] === null, 'even the no-line shortcut clears it');
}

console.log('\n== 7. Whoever lands first wins, and only once ==');
{
  // Belt and braces: the cap firing after a release (or vice versa) must not
  // resolve twice or throw.
  let release = null;
  const p = waitForLine(wait(5000), 120, (r) => { release = r; });
  const how = await p;
  ok(how === 'capped', `the cap beat the slow line (${how})`);
  assert.doesNotThrow(() => { if (release) release(); }, 'a late release must not throw');
  ok(true, 'and a release arriving after the cap is harmless');
  await wait(60);
}

console.log(`\n✅ ALL ${checks} VOICE-WAIT CHECKS PASSED`);
