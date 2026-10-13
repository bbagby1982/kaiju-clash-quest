# HANDOFF — Kaiju Clash Quest redesign (branch `claude/game-animation-monster-redesign-6rdkcp`)

Read this first when picking the game up. Session of 2026-09-02. The owner merged the
branch to `main` the same day, so the redesign is LIVE at https://godzzillagame.netlify.app/
(the link in Family-HQ's Godzilla tab) and `ELEVENLABS_KEY` is set there. Commits after
the merge (this file, the bundled Chimera Beast art) sit on the branch, rebased on main.

**Post-launch checks (2026-09-07):** `/api/voice` returns real audio in the owner's
Godzilla voice; `/admin` writes work with `ADMIN_KEY`; `/api/roster` lists 91 art entries.

**Netlify env trap:** the Netlify MCP connector's env-var upsert silently drops a variable
created with context "all"; with context "production" it works. `ADMIN_KEY` is set
(production, 2026-09-07) and reaches the functions from the first deploy after that.
Always verify with a fresh listing after any upsert.

## State of the branch
- `npm run typecheck` clean · `npm run lint` 0 errors · `npm test` 4,012 engine + 45 function
  checks · `npm run build` ok · `npm run test:e2e` drives a full battle and a race headless at
  phone / iPad / desktop widths with fake `/api/*` routes (screenshots in `tests/e2e/shots/`).
- Independent code review (10 findings) applied; scratch files removed.

## What changed (one line each — details in git log)
- Roster is runtime (`src/lib/roster.tsx`): static monsters + Canva art in Netlify Blobs +
  custom monsters, via `/api/roster`; cloud art overrides bundled placeholders.
- Battle engine is local (`src/lib/battleEngine.ts`); `/api/battle` only narrates.
- Arena rebuilt: backdrop per terrain, sprites with CSS animation states, FX, HP bars,
  VS intro, round stamps, results overlay; voices wired (narrator / announcer / two
  Godzilla voices / roars) through `src/lib/voice.ts` → `/api/voice` (ElevenLabs, cached).
- Home/title screen, roster cards, profile, encyclopedia, setup screens redesigned.
- Race mode uses sprites, camera, lanes, photo finish, podium; cloud save auto-restores.
- `/admin` Monster Studio: art upload (file or Canva link, resize, magic cut-out,
  re-optimize), custom monster editor, voice test panel. Writes need `ADMIN_KEY`.
- Netlify: Neon extension uninstalled from the team (it broke every build since April).
  `ADMIN_KEY` set on the site. `ELEVENLABS_KEY` still to be pasted by the owner.

## Art
82 of 84 non-bundled monsters have Canva-generated art in the blob store (see
`/api/roster`), and `chimera-beast` is BUNDLED (`src/assets/monsters/chimera-beast.webp`)
because its upload hit the ADMIN_KEY trap above. The one still missing after four Canva quota walls (the account allows
only a couple of generations per window) is `minotaur-prime` — the owner generates it
in Canva ("towering bull-headed minotaur kaiju, bronze horns, stone maze-wall armour,
holding a tiny map upside down") and drops it in through `/admin` (Canva link or file).
No further automatic retries are scheduled.
Lesson: Canva's generator sometimes returns a TEXT POSTER TEMPLATE or adds
watermarks — every image must be looked at before upload (about 1 in 5 first drafts
were rejected). All 91 cloud images were re-encoded on 2026-09-07 as 1024px WebP
(50 MB of PNG → 3.9 MB total); `/api/monster-image/*` now serves `image/webp`.

## Not verified on real hardware
iOS audio unlock and actual ElevenLabs playback (no key in the sandbox), the Canva-link
CORS path and WebP/PNG fallback on older Safari in `/admin`, and the feel of the
animations on an actual iPad. Everything else was exercised headless.

---

## 2026-10-12 — two bugs the owner reported, both fixed

### 1. "the voice over keeps getting cut off before it moves to the next page after the battle"

The finale fired the announcer's stamp and the winner's line as
**fire-and-forget** (`void (async () => { await speak(…); await speak(…) })()`)
and then ran a fixed **1300 ms** step before swapping in the results sheet.
Two real ElevenLabs clips run 4–8 s, so the sheet always landed mid-sentence —
and tapping Continue there unmounts the arena, whose cleanup aborts the audio
outright.

The finale now **keeps** that promise and waits on it before showing the
results. The race lives in `waitForLine()` in `src/lib/voice.ts` so it can be
executed by a test without a browser. Three ways out, whichever lands first:

1. the line ends — the normal case;
2. `FINALE_VOICE_MAX_MS` (10 s) elapses — voice must **never** block gameplay,
   so a slow or dead ElevenLabs costs a few seconds of quiet, never a child
   stranded in a fight that is already over;
3. the kid taps the caption bar.

That third one matters more than it looks: by then the beat sequence has
finished, so `skip()`'s `if (!seq.current) return` would have made
"TAP TO SKIP" a **dead control**. `skip()` now releases the hold first.

Measured end to end (`npm run test:finale`, two 2 s clips):
**4571 ms held with voice, 2791 ms silent.** With the old fire-and-forget the
sheet appeared before the finale stamp could even be observed.

### 2. "there is not back button when you are on the monster encyclopedia page"

Not an encyclopedia bug — a **game-wide** one that only hurt there.
`.kq-no-x { overflow-x: hidden }` sat on the `GameLayout` root, and
`overflow-x: hidden` makes an element a scroll container, which becomes the
containing block for every `position: sticky` descendant. So the sticky header
and the sticky bottom nav had nothing to stick inside.

Measured at 390×844 before the fix — the Encyclopedia document is **11,854 px**
tall:

| scroll | header | bottom nav |
|---|---|---|
| top | −771 (off) | 11022 (off) |
| 600 | −600 (off) | 11193 (off) |
| the very end | off | on |

So a child had **no header and no nav on screen** anywhere except the very
bottom: ~11,000 px of scrolling to reach any way out. After: header pinned at
`0..53` and nav at `782..844` at every scroll position.

The fix is to drop `kq-no-x` from that one root. `<main>` keeps its own, so
wide content is still clipped where it matters. Deliberately **not**
`overflow-x: clip`, which also works but needs Safari 16.4+ and would quietly
put the bug back on an older iPad with every test still green.

### Tests added
- `tests/voiceWait.test.mjs` — 17 checks, executes the real `waitForLine`.
- `tests/arenaWiring.test.mjs` — 16 checks, comment-stripped scan of the
  wiring either side of it, plus the layout root.
- `tests/e2e/finale-voice.mjs` — drives a real battle twice (voice working /
  voice dead) and times the results sheet. `npm run test:finale`.

Six mutations verified to turn them red, including reverting the finale to
fire-and-forget and putting `kq-no-x` back.

**Not verified on real hardware** — all measurements are headless Chromium at
390×844 with `env(safe-area-inset-*)` at 0.


### 2026-10-12, later — the audit said no, and was right

A pre-merge adversarial audit of the above found it **not safe to merge**. The
diagnoses held; the implementation had two user-visible regressions, a flaky
proof, and four vacuous assertions. All fixed:

- **Muting mid-finale froze the results for the whole 10s cap.** `stopSpeaking()`
  only `pause()`d, and `playOn` resolves on `ended`/`error`/`abort` — a pause is
  none of them, so the awaited line hung forever. Measured: **12,788 ms of dead
  arena in silence** after one tap on the speaker icon, escapable only by
  finding the caption bar. Fixed at the root: `stopSpeaking()` now settles
  every in-flight `playOn`. Re-measured after the fix: **2,789 ms**, and
  reverting the settle reproduces 12,780 ms.
- **"TAP TO SKIP" during the finale took two taps.** The beats run ~2.8 s, during
  which the hold has not started and `releaseFinale` is null — so the first tap
  flushed the animation and then *began* a 4-10 s wait. Measured on the real
  pre-fix source: **4,513 ms tapped vs 4,663 ms untapped** — the tap bought
  nothing. (An earlier version of this file said 6,551 vs 6,588; a second
  audit could not reproduce those two absolute figures, only the conclusion.
  Corrected 2026-10-13.) `finaleCut` now cuts the voice and the hold that has
  not begun. **668-712 ms** after the fix, over five runs.
- **The e2e failed ~4 runs in 5 and blamed the fix.** It detected the finale by
  `\bvictory\b` over the page text, but a player win reads "stands
  *victorious*" and VICTORY/DEFEAT/TIE exist only inside the results sheet,
  which the loop breaks on first. So whenever Alfred won it reported
  `held = -1` with the message "the results sheet cut the voice off". It now
  keys off `.arena-caption-text` matching the three real `localFinale` shapes.
  **4/4 clean runs.**
- **Five realistic mutations kept the whole suite green**, including swapping
  `kq-no-x` for Tailwind's `overflow-x-hidden`, which put the owner's
  encyclopedia bug back in full. Causes: an assertion anchored on `}` where the
  code has `]` (it matched nothing, ever, including main's pre-fix source); a
  slice that ran to end-of-file and found `requestNarration`'s identical
  `if (!mounted.current) return;`; and a guard that asserted a class name's
  absence rather than the property. All three fixed, plus two `ok(true)` lines
  in `voiceWait`.
- **The same root cause sat on four more screens.** `BattleSetup`,
  `BattlePreview` and both `BattleFocusSelection` roots each paired `kq-no-x`
  with a sticky header holding their ONLY way out — no bottom nav, they render
  outside `GameLayout`. Alfred passes `BattleSetup` on every battle. Removed
  there too. `MonsterProfile` keeps it correctly: it is `fixed inset-0
  overflow-y-auto`, its own scroll container by design.
- `waitForLine` now guards both `onRelease` calls; `holdForFinaleVoice`
  catches. Nothing about the voice can strand the sheet. **It does NOT
  "sanitise a non-finite cap"** — an earlier version of this file claimed it
  did, and a second audit executed old against new: NaN / undefined /
  Infinity already resolved `capped` in 1-2 ms on both, so § 9 of
  `voiceWait` is green on the old code too. `Math.max(0, capMs)` is there for
  readability, not behaviour, and the in-code comment that said it "pins the
  cap to something meaningful" was wrong in the other direction — it pins it
  to 0, the silent no-hold that sentence named as the problem. Both
  corrected 2026-10-13.
- The winner's line is **preloaded** at `startFinale`. It is picked at random
  per battle, so it was always a cache miss and its ElevenLabs round trip
  happened *inside* the hold — the cap arithmetic never budgeted for it. The
  **stamp** is deliberately NOT preloaded: `fetchClip` has no in-flight dedup
  and the stamp is spoken 300 ms later, so on any real network the preload was
  still in flight and the same line was fetched twice, the second `remember()`
  overwriting the first object URL without revoking it (measured: 2 POSTs, 1
  leaked blob URL, 900 ms server). Removed 2026-10-13.

### A third audit (2026-10-13) — two more things, and what is still open

- **The e2e's headline assertion could not fail for the thing it names.** It
  asserted `held >= 2,000 ms`, but the finale's beats are 300 + 1200 + 1300 ms
  and run *before* the hold is reached at all, so `held` has a structural floor
  of ~2,800 ms. The one-character mutation `if (!finaleCut.current)` →
  `if (finaleCut.current)` — which stops the arena waiting for the winner's
  line in **ordinary play**, the owner's original bug in full — left all 4,116
  unit checks and every e2e run green at 2,729-2,856 ms. The bar is now
  `>= 2 × CLIP_SECONDS` (4,000 ms); working builds measure 4,448-4,663 ms and
  the mutation now fails at 2,727 ms.
- **One tap on SKIP still played a stray clip over the results sheet — on a
  real network only.** `stopSpeaking()` settles clips that are *playing* and
  does nothing to one still being fetched, and `speak()` re-checked only
  `muted`/`aborted`, never the finale's cut. Measured by the audit with a 2 s
  `/api/voice`: sheet up at 50,253 ms, a fresh clip starting at 51,839 ms.
  Invisible at localhost latency (<5 ms), which is why the suite missed it.
  Fixed with a per-finale `AbortController` (`finaleAbort`), aborted on both of
  `skip()`'s exits and on unmount; the finale's three lines now carry
  `fsignal()`, not the arena-lifetime `vsignal()`. `finale-voice.mjs` run 4
  drives it with a **1.5 s voice server** and asserts no `<audio>.play()`
  happens after the sheet.
- **`stopSpeaking()` used to settle a ROAR.** Every `playOn` registered its
  `finish` in the shared `playing` set, roars included, and `speak()` calls
  `stopSpeaking()` on each interrupting line — so a spoken line told a roar's
  awaiter the roar was over while `stopSpeaking()` deliberately does not pause
  `roarEl`. No kid-facing effect today (the arena only does `void roar(...)`),
  but the admin Voice Test panel's roar spinner cleared mid-roar. Now only the
  speech element's `finish` is registered.
- **`npm test` protects neither fixed bug.** Both regressions are caught only
  by `tests/e2e/finale-voice.mjs`, which is in `npm run test:e2e`, not
  `npm test` — and this repo has **no CI config at all**. Verified: removing
  the settle (→12,826 ms) and removing `finaleCut` from `skip()` (→4,505 ms)
  both leave `npm test` 100 % green. If a merge gate is ever added here it
  has to run `test:e2e`.
- **Open, not a blocker: 1 px of sideways scroll at 320 px.** `kq-no-x` used to
  clip it. Max `scrollWidth - innerWidth` over 3.6 s with a full roster:
  **1 px on BattleFocusSelection's advice view at 320×568**, 0 px at 375, 390
  and above, 0 px on every other screen. The offender is the sprite's own
  animated `.sprite-guard`/`.sprite-body` (right edge 323.9 at 320 px). Inside
  `smoke.mjs`'s own `overflow <= 1` tolerance. Don't re-chase it as a layout
  bug.
- **Also measured by that audit, and better than claimed:** the four extra
  roots' Back buttons sat at y **−6,861 / −6,585 / −4,345 / −3,445** on
  BattleSetup step 1 at 320 / 390 / 820 / 1280 with a 101-monster roster —
  an order of magnitude worse than the −605 quoted below. After: sticky header
  top 0 and Back at +12 on every screen at every width.

**One claim in the first cut was wrong:** "lint 0 errors (20 pre-existing
warnings)" — main has 19; that PR added the 20th. The missing dependency is
added and the count is back to 19.

**M3's before/after numbers for the four extra roots are the auditor's, not
re-measured here** — my own probe was not landing on the same screen twice, so
I removed it rather than cite it. The change rests on the identical CSS
mechanism, conclusively measured on `GameLayout`.
