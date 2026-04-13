import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const store = getStore("monster-images");

  try {
    const { blobs } = await store.list();
    const ids = blobs.map((b) => b.key);

    return new Response(JSON.stringify({ ids }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60", // 1 min cache
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ids: [], error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/monster-images/list",
};
