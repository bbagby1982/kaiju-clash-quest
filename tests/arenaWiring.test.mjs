// ── TWO BUGS THE OWNER REPORTED ON 2026-10-12 ────────────────────────────
//
//   1. "in the godzilla game the voice over keeps getting cut off before it
//      moves to the next page after the battle."
//   2. "also there is not back button when you are on the monster
//      encyclopedia page"
//
// tests/voiceWait.test.mjs EXECUTES the race that fixes (1). This file pins
// the WIRING either side of it — the parts that are structure rather than
// behaviour, and that a future edit could quietly undo while every other test
// stayed green:
//
//   • the finale's speech promise is KEPT, not dropped on the floor;
//   • the results sheet goes through the wait;
//   • the skip tap stays live during that wait;
//   • the layout root does not re-acquire the overflow that un-sticks the
//     header and the bottom nav.
//
// Scanned COMMENT-STRIPPED, so a comment about the fix cannot stand in for
// the fix — the lesson the family-hq repo learned the hard way.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

/** Strip // and /* *​/ comments, leaving string literals alone. */
function stripComments(src) {
  let out = '', i = 0, q = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) {
      if (c === '\\') { out += c + (n ?? ''); i += 2; continue; }
      if (c === q) q = null;
      out += c; i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}

let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); console.log('  [ok] ' + m); };

const ARENA_RAW = read('src/components/game/BattleSimulation.tsx');
const ARENA = stripComments(ARENA_RAW);
const LAYOUT_RAW = read('src/components/game/GameLayout.tsx');
const LAYOUT = stripComments(LAYOUT_RAW);
const CSS = read('src/styles/home.css');

// The stripper must not have eaten the file — a vacuously green scan is worse
// than no scan at all.
ok(ARENA.length > ARENA_RAW.length * 0.45 && /setPhaseTracked/.test(ARENA),
  `comment strip left real code behind (${ARENA.length}/${ARENA_RAW.length} chars)`);

console.log('\n== 1. The finale waits for the winner to finish ==');
ok(/finaleSpeech\.current = \(async \(\) => \{/.test(ARENA),
  'the announcer + winner lines are KEPT in a ref, not fired and forgotten');
ok(!/void \(async \(\) => \{\s*await speak\(stampText/.test(ARENA),
  'and the old fire-and-forget `void (async …)` finale is gone');
ok(/void holdForFinaleVoice\(\);/.test(ARENA),
  'the finale sequence ends by going through the hold, not straight to the sheet');
// The step list closes with `]`, not `}` — anchored on `}` this matched
// NOTHING, including main's own pre-fix source, so it would have stayed green
// through a full revert of the fix (audit, 2026-10-12).
ok(!/\]\s*,\s*\(\) => \{\s*setWinner\([^)]*\);\s*setPhaseTracked\('results'\);/.test(ARENA.replace(/\s+/g, ' ')),
  'nothing jumps to the results sheet the instant the beats are over');
// ...and prove the regex can actually fire, so it never silently rots again.
ok(/\]\s*,\s*\(\) => \{\s*setWinner\([^)]*\);\s*setPhaseTracked\('results'\);/
     .test("], () => { setWinner(result.winner ?? 'tie'); setPhaseTracked('results');"),
  'and that check is anchored on something that exists — it matches the shape it forbids');
ok(/waitForLine\(spoken, FINALE_VOICE_MAX_MS/.test(ARENA),
  'the hold uses the tested race with an explicit cap');
const cap = /const FINALE_VOICE_MAX_MS = (\d+);/.exec(ARENA);
ok(cap && Number(cap[1]) >= 4000 && Number(cap[1]) <= 20000,
  `the cap is a sane number of seconds — long enough for two clips, short enough to never strand a kid (${cap && cap[1]}ms)`);
// SCOPED to the callback body. Sliced to end-of-file it also found
// `requestNarration`'s identical line, so deleting the real guard kept it green.
{
  const i = ARENA.indexOf('const holdForFinaleVoice');
  const body = ARENA.slice(i, ARENA.indexOf('}, [setPhaseTracked]);', i));
  ok(i > 0 && body.length > 40 && body.length < 1200, `the hold's body was isolated (${body.length} chars)`);
  ok(/if \(!mounted\.current\) return;/.test(body),
    'and it checks the arena is still mounted before showing anything');
  ok(/finaleCut\.current/.test(body), 'and honours a skip that happened before the hold began');
  ok(/catch/.test(body), 'and a throw inside the wait can never strand the results sheet');
}

console.log('\n== 2. "TAP TO SKIP" stays a live control during that wait ==');
// The beat sequence is finished by then, so skip()'s `if (!seq.current) return`
// would make the tap do nothing at all — a dead control, which is never the
// answer to anything.
// Scoped to skip()'s own body, and matched on the PROPERTY rather than a
// one-line spelling — the old regex pinned `{ releaseFinale.current(); return; }`
// exactly and went red the moment the branch gained the abort below, which is
// a test breaking on a correct change.
const skipBody = ARENA.slice(ARENA.indexOf('const skip = useCallback'), ARENA.indexOf('}, [clearTimers]);'));
ok(skipBody.length > 200 && skipBody.length < 2500, `skip()'s body was isolated (${skipBody.length} chars)`);
const RELEASE_FIRST = /if \(releaseFinale\.current\) \{[\s\S]{0,200}?releaseFinale\.current\(\);[\s\S]{0,80}?return;/;
ok(RELEASE_FIRST.test(skipBody),
  'skip() releases the voice hold BEFORE its no-sequence early return');
// Anti-rot, both directions: the regex must match a correct body and reject
// one where the release is not actually called.
ok(RELEASE_FIRST.test('if (releaseFinale.current) { releaseFinale.current(); return; }'),
  'and that check matches the shape it demands, so it is not anchored on nothing');
ok(!RELEASE_FIRST.test('if (releaseFinale.current) { finaleCut.current = true; return; }'),
  'while rejecting a branch that returns WITHOUT releasing — a dead tap again');
ok(skipBody.indexOf('releaseFinale.current') < skipBody.indexOf('const s = seq.current'),
  'and does so first, so the tap can never land on nothing');
ok(/\(release\) => \{ releaseFinale\.current = release; \}/.test(ARENA),
  'the releaser is handed in and cleared by waitForLine itself');
// ── ONE TAP, AND NOTHING ARRIVES AFTER THE SHEET ────────────────────────
// `stopSpeaking()` settles clips that are PLAYING and does nothing to one
// still being fetched. Measured with a realistic 2s /api/voice latency: the
// results sheet was up at 50,253ms and a fresh announcer clip started at
// 51,839ms, over the top of it. Invisible on localhost (<5ms), so only a
// structural check holds this.
ok(/const finaleAbort = useRef<AbortController \| null>\(null\);/.test(ARENA),
  'the finale has its OWN abort controller, separate from the arena-lifetime one');
ok((skipBody.match(/finaleAbort\.current\?\.abort\(\)/g) || []).length === 2,
  'and skip() aborts it on BOTH exits — the released-hold one and the mid-finale one');
ok(/finaleAbort\.current = new AbortController\(\);/.test(ARENA),
  'a fresh one per finale, so battle 2 is not born aborted');
const finaleBody = ARENA.slice(ARENA.indexOf('const startFinale = useCallback'), ARENA.indexOf('const beginRound = useCallback'));
ok(finaleBody.length > 500 && !/signal: vsignal\(\)/.test(finaleBody),
  `the finale's speech uses the finale's signal, not the arena's (${finaleBody.length} chars)`);
ok((finaleBody.match(/signal: fsignal\(\)/g) || []).length === 3,
  'all three of its lines — stamp, win, lose — go through it');
ok(!/preloadSpeech\(stampText/.test(ARENA),
  'and the stamp is not prefetched 300ms before it is spoken, which just fetched it twice and leaked a blob URL');

console.log('\n== 3. The header and the bottom nav can actually stick ==');
// Owner: "there is not back button when you are on the monster encyclopedia
// page". Measured at 390x844 BEFORE the fix: the Encyclopedia document is
// 11,854px tall and neither the header (top -771) nor the nav (top 11,022)
// was on screen at any scroll position except the very end. Cause:
// `overflow-x: hidden` on the layout root makes it a scroll container, and a
// scroll container becomes the containing block for its sticky descendants.
ok(/sticky top-0/.test(LAYOUT) && /sticky bottom-0/.test(LAYOUT),
  'the header and nav are still declared sticky');
const rootDiv = /<div className="min-h-screen flex flex-col bg-background([^"]*)"/.exec(LAYOUT);
ok(rootDiv, 'the layout root is where it was expected');
ok(rootDiv && !/kq-no-x/.test(rootDiv[1]),
  'and it does NOT carry kq-no-x — that is what un-stuck both of them');
// Asserting the absence of one CLASS NAME is not the property. Swapping in
// Tailwind's `overflow-x-hidden` reinstated the bug in full (measured: header
// -600, nav 11193 at scrollY 600) with the whole suite green. What matters is
// that NOTHING on that root makes it a scroll container.
// ONE pattern, not a list of spellings. The list form missed
// `overflow-x-auto`, `overflow-x-scroll`, `overflow-scroll` and
// `overflow-clip` (note `overflow-auto` is not a substring of
// `overflow-x-auto`), and an audit proved it: a root carrying
// `overflow-x-auto` kept all 33 checks green and put the owner's bug back in
// full — Encyclopedia at 390x844, header top −600, nav top 11,117 in an
// 11,779px document, neither on screen at any scroll position.
const OVERFLOW_UTIL = /\boverflow(-[xy])?-(hidden|auto|scroll|clip)\b/;
ok(rootDiv && !OVERFLOW_UTIL.test(rootDiv[1]),
  'and carries no other overflow utility either — any of them re-breaks sticky: ' + (rootDiv && rootDiv[1]));
// ...and the pattern must actually reject the spellings the list missed.
ok(['overflow-x-auto','overflow-x-scroll','overflow-scroll','overflow-clip',
    'overflow-hidden','overflow-x-hidden','overflow-y-auto']
     .every(u => OVERFLOW_UTIL.test('min-h-screen flex ' + u)),
  'and that pattern catches every spelling, including the four the old list let through');
ok(!OVERFLOW_UTIL.test('min-h-screen flex flex-col bg-background'),
  'while a clean root still passes it');
ok(/<main key=\{activeTab\} className="[^"]*kq-no-x/.test(LAYOUT),
  'the clipping still happens on <main>, where wide content actually lives');
ok(/\.kq-no-x\s*\{[^}]*overflow-x:\s*hidden/.test(CSS),
  'kq-no-x itself is unchanged — MonsterProfile still relies on it');

// The same root cause sat on four MORE full-screen views, each pairing
// kq-no-x on a min-h-screen root with a sticky header holding the ONLY way
// out — no bottom nav, because they render outside GameLayout. Measured at
// 390x844 with a full roster, BattleSetup's Back button sat at y -605 once
// scrolled. Alfred passes through that screen on every single battle.
['BattleSetup', 'BattlePreview', 'BattleFocusSelection'].forEach((name) => {
  const src = stripComments(read(`src/components/game/${name}.tsx`));
  const roots = src.match(/className="min-h-screen[^"]*"/g) || [];
  ok(roots.length > 0, `${name} has a full-screen root`);
  roots.forEach((r) => ok(!/kq-no-x/.test(r) && !OVERFLOW_UTIL.test(r),
    `${name}'s root does not re-break its own sticky header: ${r}`));
  ok(/sticky top-0/.test(src), `${name} still has the sticky header that holds its Back button`);
});
// MonsterProfile is the one that KEEPS it, and correctly: it is
// `fixed inset-0 overflow-y-auto`, its own scroll container by design, so its
// sticky close button sticks inside it. Measured on screen at y 16.
{
  const mp = stripComments(read('src/components/game/MonsterProfile.tsx'));
  ok(/fixed inset-0[^"]*overflow-y-auto/.test(mp),
    'MonsterProfile is its own scroll container, so kq-no-x there is harmless');
  ok(/kq-sticky-close/.test(mp), 'and its close button sticks inside that scroller');
}

console.log(`\n✅ ALL ${checks} ARENA-WIRING CHECKS PASSED`);
