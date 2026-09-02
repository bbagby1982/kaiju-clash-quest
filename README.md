# Kaiju Clash Quest

A Godzilla monster-battle game built for Alfred, an 8-year-old Godzilla expert.
Pick a kaiju, battle or race an opponent across five terrains, and unlock more
monsters as you win. Alfred designs new monster art in Canva; his parents add
it (and can design brand-new monsters from scratch) through the **Monster
Studio** admin page at `/admin`.

Live at **https://godzzillagame.netlify.app**, deployed from this repo's
`main` branch. (There is a separate, empty "Godzillagame" GitHub repo — it is
unused; this repo is the real one.)

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix primitives) + [lucide-react](https://lucide.dev/) icons
- [Netlify Functions](https://docs.netlify.com/functions/overview/) (`netlify/functions/*.mts`) for the small server-side surface: battle narration and the monster art/roster API
- [Netlify Blobs](https://docs.netlify.com/blobs/overview/) for storage — no database. Two stores: `monster-images` (art) and `monster-defs` (custom monster JSON)
- Optional AI opponent narration via the [Anthropic SDK](https://www.npmjs.com/package/@anthropic-ai/sdk)

## Getting started

```sh
npm install
npm run dev      # Vite dev server at http://localhost:8080
npm run build    # production build to dist/
npm run lint     # eslint
```

The dev server alone does **not** run the Netlify Functions — `/api/*`
requests will 404 under plain `npm run dev`. To exercise the roster/art API
and the AI narrator locally, run the [Netlify CLI](https://cli.netlify.com/)
(`netlify dev`) instead, or point the app at the deployed site's `/api/*`
routes.

## How monster art and custom monsters flow

1. **Alfred designs art in Canva** and exports a PNG/JPG/WebP (or copies the
   export link).
2. **A parent opens `/admin`** (the Monster Studio), enters the admin key,
   and either drops the exported file in or pastes the Canva link. The page
   resizes it, optionally cuts out the background, and encodes it as WebP
   client-side before uploading.
3. The upload hits `netlify/functions/upload-monster-image.mts`
   (`POST /api/admin/upload-monster-image`), which writes the image into the
   `monster-images` Netlify Blobs store.
4. Brand-new monsters (stats, abilities, lore) are created the same way
   through `netlify/functions/monsters-admin.mts`
   (`POST /api/admin/monsters`), stored one JSON document per id in the
   `monster-defs` store. Editing a *bundled* monster's id there creates a
   custom **override** with the same id — it takes precedence everywhere in
   the game, but the bundled definition in `src/data/monsters.ts` is untouched.
5. The game (and the admin page itself) reads both stores through
   `netlify/functions/roster.mts` (`GET /api/roster`), merged by
   `src/lib/roster.tsx` with the ~100 hand-written monsters in
   `src/data/monsters.ts` and any art bundled into the build
   (`src/lib/monsterImages.ts`). A monster is only offered to play once it
   has art from somewhere.
6. `netlify/functions/monster-image.mts` (`GET /api/monster-image/{id}`)
   serves the actual image bytes to the game.

## Netlify environment variables

| Variable | Required | Purpose |
|---|---|---|
| `ADMIN_KEY` | **Yes**, for any write | Shared secret for `/admin`. Without it, `/api/admin/*` refuses every write with a 503 that says exactly that — set it under Site configuration → Environment variables, then redeploy. |
| `ANTHROPIC_API_KEY` | No | Powers the optional AI battle narrator (`netlify/functions/battle.mts`). Without it, the game falls back to its own local captions — battles still work. |

## File map

```
src/
  pages/
    Index.tsx            the game itself (home, battle, race, encyclopedia)
    Admin.tsx             Monster Studio admin page (/admin)
  components/
    game/                 battle/race UI, MonsterSprite, MonsterCard, etc.
    admin/                 Monster Studio: gallery, art pipeline, monster form
    ui/                    shadcn/ui primitives
  data/monsters.ts         ~100 hand-written bundled monsters
  lib/
    roster.tsx             merges bundled + cloud art + custom monsters
    monsterImages.ts        build-time art bundled into the app
    battleEngine.ts         battle/race simulation logic
  types/game.ts            Monster, stats, battle/race state types
netlify/functions/
  roster.mts                GET  /api/roster
  monster-image.mts          GET  /api/monster-image/{id}
  upload-monster-image.mts   POST/DELETE /api/admin/upload-monster-image (admin key)
  monsters-admin.mts         GET/POST/DELETE /api/admin/monsters (admin key for writes)
  battle.mts                  POST /api/battle (AI narration)
  cloud-save.mts               cross-device save sync
  _admin.mts                   shared admin-key gate
public/admin.html             redirects old /admin.html bookmarks to /admin
```
