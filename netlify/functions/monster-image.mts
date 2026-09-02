import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

/**
 * GET /api/monster-image/{id}
 * Serves a Canva image from the "monster-images" blob store. The content type comes
 * from the metadata stamped at upload (older uploads had none and are served as PNG).
 * The game appends ?v=<etag> so a re-upload is never stuck behind this long cache.
 */
export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const monsterId = decodeURIComponent(url.pathname.replace("/api/monster-image/", "").replace(/\/$/, ""));

  if (!monsterId || !/^[a-z0-9][a-z0-9-]{0,60}$/.test(monsterId)) {
    return new Response("Monster ID required", { status: 400 });
  }

  const store = getStore("monster-images");

  try {
    const result = await store.getWithMetadata(monsterId, { type: "arrayBuffer" });
    if (!result || !result.data) return new Response("Image not found", { status: 404 });

    const contentType = typeof result.metadata?.contentType === "string" && result.metadata.contentType.startsWith("image/")
      ? result.metadata.contentType
      : "image/png";

    if (req.method === "HEAD") {
      return new Response(null, { headers: { "Content-Type": contentType, ETag: result.etag || "" } });
    }

    return new Response(result.data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        ETag: result.etag || "",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response("Image not found", { status: 404 });
  }
};

export const config: Config = {
  path: "/api/monster-image/*",
};
