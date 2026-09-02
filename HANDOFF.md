# HANDOFF — paused 2026-09-02 (owner asked to stop until new credits)

Branch `claude/game-animation-monster-redesign-6rdkcp`. Read this first when resuming.

## Done, committed, tested
- Runtime roster (`src/lib/roster.tsx`), local battle engine (`src/lib/battleEngine.ts`),
  `MonsterSprite` + CSS animation library (`src/index.css`), rewritten Netlify functions
  (roster, image serving, upload by file/URL, custom monsters, narrator on the Anthropic SDK,
  ElevenLabs voice + roars). `npm test` = 4,012 engine + 44 function checks.
- Monster Studio at `/admin` (art upload/cut-out/re-optimize, custom monster editor), README.
- Race mode with sprites/camera/podium; cloud-save auto-restore; dead components removed.
- Netlify: the team-level Neon extension that broke every build since April is UNINSTALLED.
  `ADMIN_KEY` is set on the `godzzillagame` site (owner has the value in chat).
  `ELEVENLABS_KEY` is NOT set there yet — it is a masked secret on bb-family-hq, so the
  owner must paste it into the game site herself. Voice ids pinned in `voice.mts`:
  godzilla `fJmSoZVxiWuuypwIZMZa`, godzilla2 `Ducd71NdsHmshEfzo7mz`.
- Canva pipeline proven: Terramoth art generated, exported, uploaded to the live blob store.

## In progress — the WIP commit after this note DOES NOT COMPILE
Two agents were stopped mid-edit; their partial files are committed so they are not lost:
- Arena rewrite: `src/components/game/BattleSimulation.tsx`, `src/components/game/arena/*`,
  `src/styles/arena.css` — brief: VS intro, beats-driven playback from `resolveRound`,
  backdrop per terrain, FX, HP bars, results overlay; `/api/battle` is narration-only.
- Home/roster screens: `src/pages/Index.tsx`, `HomeScreen.tsx`, `GameLayout.tsx`,
  `MonsterCard/Profile`, `EncyclopediaEntry`, `BattleSetup/Preview/Focus/Booster`,
  `src/styles/home.css` — brief: title screen with featured sprite, 5 tabs, art-forward cards.
Resume by running `npx tsc -p tsconfig.app.json --noEmit` and finishing whatever it flags.

## Not started
- Wire `src/lib/voice.ts` into the arena (captions → narrator, FIGHT!/K.O.! → announcer,
  specials → `roar()`, victory quote → godzilla/godzilla2, 🔊 mute in the HUD) and a voice
  test panel in `/admin`.
- Canva batch: 82 monsters still need art. Slices and a per-monster procedure are in the
  session scratchpad only (`canva/slice-{1,2,3}.json`) — regenerate from `src/data/monsters.ts`
  (every id not in the bundled set + not in `/api/roster` art). Owner direction: every monster
  must look different; silly ones genuinely silly ("wild purple hair").
- `tests/e2e/smoke.mjs` (Playwright, fake `/api/*`) is written but not yet run against the
  finished screens; expect selector tweaks.
- Merge to `main` to deploy; then `/admin` → Re-optimize the 3–6 MB legacy PNGs.
