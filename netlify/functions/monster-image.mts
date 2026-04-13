import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const monsterId = url.pathname.replace("/api/monster-image/", "").replace(/\/$/, "");

  if (!monsterId) {
    return new Response("Monster ID required", { status: 400 });
  }

  const store = getStore("monster-images");

  try {
    const imageData = await store.get(monsterId, { type: "arrayBuffer" });

    if (!imageData) {
      return new Response("Image not found", { status: 404 });
    }

    return new Response(imageData, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return new Response("Image not found", { status: 404 });
  }
};

export const config: Config = {
  path: "/api/monster-image/*",
};
