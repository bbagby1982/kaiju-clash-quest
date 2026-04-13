import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Simple admin protection using the API key
  const adminKey = Netlify.env.get("ADMIN_KEY");
  const authHeader = req.headers.get("x-admin-key");

  if (adminKey && authHeader !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const body = await req.json();

    // Single image upload: { monsterId, imageUrl }
    // Batch upload: { images: [{ monsterId, imageUrl }, ...] }
    const images = body.images || [{ monsterId: body.monsterId, imageUrl: body.imageUrl }];
    const results: { monsterId: string; status: string }[] = [];
    const store = getStore("monster-images");

    for (const { monsterId, imageUrl } of images) {
      if (!monsterId || !imageUrl) {
        results.push({ monsterId: monsterId || "unknown", status: "missing data" });
        continue;
      }

      try {
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) {
          results.push({ monsterId, status: `fetch failed: ${imgResponse.status}` });
          continue;
        }

        const arrayBuffer = await imgResponse.arrayBuffer();
        await store.set(monsterId, new Blob([arrayBuffer]), {
          metadata: { uploadedAt: new Date().toISOString(), source: "canva" },
        });

        results.push({ monsterId, status: "success" });
      } catch (err: any) {
        results.push({ monsterId, status: `error: ${err.message}` });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/admin/upload-monster-image",
};
