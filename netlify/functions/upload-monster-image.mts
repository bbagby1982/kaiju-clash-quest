import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { requireAdmin, isValidMonsterId } from "./_admin.mts";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * POST /api/admin/upload-monster-image   (x-admin-key header required)
 *   { monsterId, imageUrl }            — fetch a Canva export link server-side
 *   { monsterId, dataUrl }             — a data:image/...;base64,... the admin page resized
 *   { images: [ {monsterId, imageUrl|dataUrl}, ... ] } — batch
 * DELETE /api/admin/upload-monster-image?id=<monsterId>
 *
 * Every blob is stamped with its content type so /api/monster-image can serve
 * WebP/JPEG correctly, and with the upload time for the admin gallery.
 */
export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const denied = requireAdmin(req);
  if (denied) return denied;

  const store = getStore("monster-images");

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!isValidMonsterId(id)) return Response.json({ error: "Bad monster id" }, { status: 400 });
    await store.delete(id);
    return Response.json({ ok: true, monsterId: id });
  }

  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Body must be JSON" }, { status: 400 }); }

  const images: { monsterId?: string; imageUrl?: string; dataUrl?: string }[] =
    Array.isArray(body?.images) ? body.images : [{ monsterId: body?.monsterId, imageUrl: body?.imageUrl, dataUrl: body?.dataUrl }];

  const results: { monsterId: string; status: string; bytes?: number; contentType?: string }[] = [];

  for (const item of images) {
    const monsterId = String(item?.monsterId || "").trim().toLowerCase();
    if (!isValidMonsterId(monsterId)) { results.push({ monsterId: monsterId || "unknown", status: "bad monster id (letters, digits, dashes)" }); continue; }
    try {
      let bytes: ArrayBuffer;
      let contentType: string;
      if (item.dataUrl) {
        const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(item.dataUrl);
        if (!m) { results.push({ monsterId, status: "dataUrl must be a base64 data:image/* URL" }); continue; }
        contentType = m[1].toLowerCase();
        const bin = Buffer.from(m[2], "base64");
        bytes = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
      } else if (item.imageUrl) {
        let target: URL;
        try { target = new URL(item.imageUrl); } catch { results.push({ monsterId, status: "imageUrl is not a valid URL" }); continue; }
        if (target.protocol !== "https:") { results.push({ monsterId, status: "imageUrl must be https" }); continue; }
        const res = await fetch(target.toString(), { redirect: "follow" });
        if (!res.ok) { results.push({ monsterId, status: `fetch failed: ${res.status}` }); continue; }
        contentType = (res.headers.get("content-type") || "image/png").split(";")[0].trim().toLowerCase();
        if (!contentType.startsWith("image/")) { results.push({ monsterId, status: `not an image (${contentType})` }); continue; }
        bytes = await res.arrayBuffer();
      } else {
        results.push({ monsterId, status: "missing imageUrl or dataUrl" });
        continue;
      }

      if (bytes.byteLength === 0) { results.push({ monsterId, status: "empty image" }); continue; }
      if (bytes.byteLength > MAX_BYTES) { results.push({ monsterId, status: `too large (${Math.round(bytes.byteLength / 1024)} KB, max ${MAX_BYTES / 1024} KB) — use the resize option` }); continue; }

      await store.set(monsterId, new Blob([bytes], { type: contentType }), {
        metadata: { uploadedAt: new Date().toISOString(), contentType, bytes: bytes.byteLength, source: item.dataUrl ? "admin-page" : "url" },
      });
      results.push({ monsterId, status: "success", bytes: bytes.byteLength, contentType });
    } catch (err: any) {
      results.push({ monsterId, status: `error: ${err?.message || err}` });
    }
  }

  return Response.json({ results });
};

export const config: Config = {
  path: "/api/admin/upload-monster-image",
};
