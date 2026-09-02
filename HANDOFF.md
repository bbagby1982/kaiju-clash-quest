# HANDOFF — Kaiju Clash Quest redesign (branch `claude/game-animation-monster-redesign-6rdkcp`)

Read this first when picking the game up. Session of 2026-09-02. The owner merged the
branch to `main` the same day, so the redesign is LIVE at https://godzzillagame.netlify.app/
(the link in Family-HQ's Godzilla tab) and `ELEVENLABS_KEY` is set there. Commits after
the merge (this file, the bundled Chimera Beast art) sit on the branch, rebased on main.

**Netlify env trap:** the Netlify MCP connector's env-var upsert answers "upserted" but the
variable NEVER appears on the site (checked twice for `ADMIN_KEY`; only the owner's
`ELEVENLABS_KEY` is listed). So `ADMIN_KEY` is NOT set: `/admin` writes return
"ADMIN_KEY is not configured" until the owner adds it in the Netlify UI (Site
configuration → Environment variables, scope Functions) — any value she likes — and
triggers a deploy (env vars reach functions on the next deploy). Do not trust the
connector for env vars; verify with a fresh listing.

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
were rejected). Legacy PNGs (showa, infernox, glacius, sockzilla, mechazord,
king-ghidorah) are 3–6 MB: press "Re-optimize" in `/admin` after deploy.

## Not verified on real hardware
iOS audio unlock and actual ElevenLabs playback (no key in the sandbox), the Canva-link
CORS path and WebP/PNG fallback on older Safari in `/admin`, and the feel of the
animations on an actual iPad. Everything else was exercised headless.
