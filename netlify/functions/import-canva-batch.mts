import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// One-time import: Elemental monsters from Canva
// DELETE THIS FILE after running it once!
const MONSTERS_TO_IMPORT: { id: string; exportUrl: string }[] = [];

export default async (req: Request, context: Context) => {
  const adminKey = Netlify.env.get("ADMIN_KEY");
  const url = new URL(req.url);
  const authKey = url.searchParams.get("key") || req.headers.get("x-admin-key");

  if (adminKey && authKey !== adminKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept POST with array of {id, exportUrl}
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const images: { id: string; exportUrl: string }[] = body.images || [];
      
      if (!images.length) {
        return Response.json({ error: "Pass { images: [{id, exportUrl}, ...] }" }, { status: 400 });
      }

      const store = getStore("monster-images");
      const results: { id: string; status: string; bytes?: number }[] = [];

      for (const { id, exportUrl } of images) {
        try {
          const imgRes = await fetch(exportUrl);
          if (!imgRes.ok) {
            results.push({ id, status: `fetch-failed-${imgRes.status}` });
            continue;
          }
          const buf = await imgRes.arrayBuffer();
          await store.set(id, new Blob([buf]), {
            metadata: { uploadedAt: new Date().toISOString(), source: "canva-elemental" },
          });
          results.push({ id, status: "success", bytes: buf.byteLength });
        } catch (err: any) {
          results.push({ id, status: `error: ${err.message}` });
        }
      }

      return Response.json({ results });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  return Response.json({ 
    usage: "POST with { images: [{id, exportUrl}, ...] } and ?key=admin-key",
    note: "Delete this function after use!"
  });
};

export const config: Config = {
  path: "/api/admin/import-canva-batch",
};
