/**
 * Shared admin gate for the write endpoints (art upload, custom monsters).
 *
 * The ADMIN_KEY environment variable MUST be set in the Netlify project. If it is
 * missing the endpoints refuse every write — the old behaviour ("no key configured
 * means anyone can upload") left a kid's game open to strangers replacing his art.
 */
export function requireAdmin(req: Request): Response | null {
  const adminKey = Netlify.env.get("ADMIN_KEY");
  if (!adminKey) {
    return Response.json(
      { error: "ADMIN_KEY is not configured on this Netlify site. Add it under Site configuration → Environment variables, then redeploy." },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const provided = req.headers.get("x-admin-key") || url.searchParams.get("key") || "";
  if (!timingSafeEqual(provided, adminKey)) {
    return Response.json({ error: "Unauthorized — wrong admin key" }, { status: 401 });
  }
  return null;
}

export function isValidMonsterId(id: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,60}$/.test(id);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
