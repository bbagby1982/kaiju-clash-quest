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
ok(!/\}\s*,\s*\(\) => \{\s*setWinner\([^)]*\);\s*setPhaseTracked\('results'\);/.test(ARENA.replace(/\s+/g, ' ')),
  'nothing jumps to the results sheet the instant the beats are over');
ok(/waitForLine\(spoken, FINALE_VOICE_MAX_MS/.test(ARENA),
  'the hold uses the tested race with an explicit cap');
const cap = /const FINALE_VOICE_MAX_MS = (\d+);/.exec(ARENA);
ok(cap && Number(cap[1]) >= 4000 && Number(cap[1]) <= 20000,
  `the cap is a sane number of seconds — long enough for two clips, short enough to never strand a kid (${cap && cap[1]}ms)`);
ok(/if \(!mounted\.current\) return;/.test(ARENA.slice(ARENA.indexOf('holdForFinaleVoice'))),
  'and it checks the arena is still mounted before showing anything');

console.log('\n== 2. "TAP TO SKIP" stays a live control during that wait ==');
// The beat sequence is finished by then, so skip()'s `if (!seq.current) return`
// would make the tap do nothing at all — a dead control, which is never the
// answer to anything.
ok(/if \(releaseFinale\.current\) \{ releaseFinale\.current\(\); return; \}/.test(ARENA),
  'skip() releases the voice hold BEFORE its no-sequence early return');
const skipBody = ARENA.slice(ARENA.indexOf('const skip = useCallback'));
ok(skipBody.indexOf('releaseFinale.current') < skipBody.indexOf('const s = seq.current'),
  'and does so first, so the tap can never land on nothing');
ok(/\(release\) => \{ releaseFinale\.current = release; \}/.test(ARENA),
  'the releaser is handed in and cleared by waitForLine itself');

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
ok(/<main key=\{activeTab\} className="[^"]*kq-no-x/.test(LAYOUT),
  'the clipping still happens on <main>, where wide content actually lives');
ok(/\.kq-no-x\s*\{[^}]*overflow-x:\s*hidden/.test(CSS),
  'kq-no-x itself is unchanged — other screens still rely on it');

console.log(`\n✅ ALL ${checks} ARENA-WIRING CHECKS PASSED`);
