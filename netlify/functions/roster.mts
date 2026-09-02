import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

/**
 * GET /api/roster
 * The cloud half of the monster roster: which ids have Canva art in the "monster-images"
 * store (with a version token so re-uploads bust the browser cache) and every custom
 * monster saved in "monster-defs". Public, read-only, cached for one minute.
 */
export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const art: Record<string, string> = {};
  const custom: unknown[] = [];
  const errors: string[] = [];

  try {
    const images = getStore("monster-images");
    const { blobs } = await images.list();
    for (const b of blobs) art[b.key] = b.etag || "1";
  } catch (err: any) {
    errors.push(`images: ${err?.message || err}`);
  }

  try {
    const defs = getStore("monster-defs");
    const { blobs } = await defs.list();
    const bodies = await Promise.all(blobs.map(async (b) => {
      try { return await defs.get(b.key, { type: "json" }); } catch { return null; }
    }));
    for (const body of bodies) if (body && typeof body === "object" && typeof (body as any).id === "string") custom.push(body);
  } catch (err: any) {
    errors.push(`defs: ${err?.message || err}`);
  }

  return Response.json({ art, custom, errors, generatedAt: new Date().toISOString() }, {
    headers: {
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const config: Config = {
  path: "/api/roster",
};
