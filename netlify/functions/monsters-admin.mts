import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin, isValidMonsterId } from "./_admin.mts";

/**
 * Custom monsters — the ones Alfred designs in /admin.html.
 *   GET    /api/admin/monsters          public: list every custom monster
 *   POST   /api/admin/monsters          admin: create or replace one (body = monster JSON)
 *   DELETE /api/admin/monsters?id=...   admin: remove one (its art stays until deleted separately)
 *
 * Stored one JSON document per id in the "monster-defs" blob store. The game merges
 * them into the roster at boot (src/lib/roster.tsx), so nothing here needs a redeploy.
 */

const ABILITY_TYPES = ["beam", "melee", "area", "buff", "projectile", "debuff", "drain", "movement", "trap", "energy"];
const RARITIES = ["common", "rare", "legendary"];
const TERRAINS = ["city", "island", "ocean", "volcano", "ruins", "storm", "space", "sky", "jungle", "arctic", "desert"];

const str = (v: unknown, max: number, fallback = ""): string => (typeof v === "string" ? v.trim().slice(0, max) : fallback);
const num = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : fallback;
};
const strList = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v) ? v.map((s) => str(s, maxLen)).filter(Boolean).slice(0, maxItems) : [];

export function sanitizeMonster(input: any): { ok: true; monster: Record<string, unknown> } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Body must be a monster object" };
  const id = str(input.id, 61).toLowerCase();
  if (!isValidMonsterId(id)) return { ok: false, error: "id must be letters, digits and dashes (e.g. lava-rex)" };
  const name = str(input.name, 40);
  if (name.length < 2) return { ok: false, error: "name is required (2-40 characters)" };
  const ability = input.specialAbility && typeof input.specialAbility === "object" ? input.specialAbility : {};
  const abilityName = str(ability.name, 40) || "Mega Attack";
  const abilityType = ABILITY_TYPES.includes(ability.type) ? ability.type : "beam";
  const rarity = RARITIES.includes(input.rarity) ? input.rarity : "rare";
  const stats = input.stats && typeof input.stats === "object" ? input.stats : {};
  const facing = input.facing === "left" ? "left" : "right";
  const imageColor = /^hsl\([0-9. ]+%?[ ,][0-9.]+%[ ,][0-9.]+%\)$/.test(str(input.imageColor, 40)) || /^#[0-9a-fA-F]{6}$/.test(str(input.imageColor, 10))
    ? str(input.imageColor, 40)
    : "hsl(120 40% 25%)";

  return {
    ok: true,
    monster: {
      id,
      name,
      title: str(input.title, 60) || "Custom Kaiju",
      era: str(input.era, 60) || "Alfred's Lab",
      description: str(input.description, 600) || `${name} was designed by Alfred.`,
      stats: {
        speed: num(stats.speed, 1, 100, 60),
        strength: num(stats.strength, 1, 100, 60),
        defense: num(stats.defense, 1, 100, 60),
        specialAttack: num(stats.specialAttack, 1, 100, 60),
      },
      specialAbility: { name: abilityName, description: str(ability.description, 200) || `${name}'s signature move.`, type: abilityType },
      terrainBonus: strList(input.terrainBonus, 4, 20).filter((t) => TERRAINS.includes(t)),
      rarity,
      imageColor,
      funFacts: strList(input.funFacts, 6, 140),
      strengths: strList(input.strengths, 5, 80),
      weaknesses: strList(input.weaknesses, 5, 80),
      facing,
      custom: true,
      updatedAt: new Date().toISOString(),
    },
  };
}

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  const store = getStore("monster-defs");

  if (req.method === "GET") {
    try {
      const { blobs } = await store.list();
      const monsters = (await Promise.all(blobs.map(async (b) => {
        try { return await store.get(b.key, { type: "json" }); } catch { return null; }
      }))).filter(Boolean);
      return Response.json({ monsters }, { headers: { "Cache-Control": "no-store" } });
    } catch (err: any) {
      return Response.json({ monsters: [], error: err?.message || String(err) }, { status: 500 });
    }
  }

  const denied = requireAdmin(req);
  if (denied) return denied;

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!isValidMonsterId(id)) return Response.json({ error: "Bad monster id" }, { status: 400 });
    await store.delete(id);
    return Response.json({ ok: true, id });
  }

  if (req.method === "POST" || req.method === "PUT") {
    let body: any;
    try { body = await req.json(); } catch { return Response.json({ error: "Body must be JSON" }, { status: 400 }); }
    const result = sanitizeMonster(body);
    if (result.ok === false) return Response.json({ error: result.error }, { status: 400 });
    await store.setJSON(result.monster.id as string, result.monster);
    return Response.json({ ok: true, monster: result.monster });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/admin/monsters",
};
