# HANDOFF — Kaiju Clash Quest redesign (branch `claude/game-animation-monster-redesign-6rdkcp`)

Read this first when picking the game up. Session of 2026-09-02; everything below is
committed and pushed. The branch is NOT merged to `main` — merging is what deploys it to
https://godzzillagame.netlify.app/ (the link in Family-HQ's Godzilla tab).

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
`/api/roster`). Missing after three Canva quota walls (the account allows only a couple
of generations per window): `chimera-beast`, `minotaur-prime` — one more retry is
scheduled; otherwise generate them in `/admin` (Canva link or file drop).
Lesson: Canva's generator sometimes returns a TEXT POSTER TEMPLATE or adds
watermarks — every image must be looked at before upload (about 1 in 5 first drafts
were rejected). Legacy PNGs (showa, infernox, glacius, sockzilla, mechazord,
king-ghidorah) are 3–6 MB: press "Re-optimize" in `/admin` after deploy.

## Not verified on real hardware
iOS audio unlock and actual ElevenLabs playback (no key in the sandbox), the Canva-link
CORS path and WebP/PNG fallback on older Safari in `/admin`, and the feel of the
animations on an actual iPad. Everything else was exercised headless.
