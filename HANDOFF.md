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
  flushed the animation and then *began* a 4-10 s wait. Measured: 6,551 ms
  tapped vs 6,588 ms untapped; the tap bought nothing. `finaleCut` now cuts the
  voice and the hold that has not begun. **649 ms** after the fix.
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
- `waitForLine` now guards both `onRelease` calls and sanitises a non-finite
  cap; `holdForFinaleVoice` catches. Nothing about the voice can strand the
  sheet.
- The winner's line is **preloaded** at `startFinale`. It is picked at random
  per battle, so it was always a cache miss and its ElevenLabs round trip
  happened *inside* the hold — the cap arithmetic never budgeted for it.

**One claim in the first cut was wrong:** "lint 0 errors (20 pre-existing
warnings)" — main has 19; that PR added the 20th. The missing dependency is
added and the count is back to 19.

**M3's before/after numbers for the four extra roots are the auditor's, not
re-measured here** — my own probe was not landing on the same screen twice, so
I removed it rather than cite it. The change rests on the identical CSS
mechanism, conclusively measured on `GameLayout`.
