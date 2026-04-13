import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const store = getStore("player-saves");

  // GET = load save, POST = write save
  if (req.method === "GET") {
    const url = new URL(req.url);
    const playerName = url.searchParams.get("player");
    const secretCode = url.searchParams.get("code");

    if (!playerName || !secretCode) {
      return new Response(JSON.stringify({ error: "Missing player name or code" }), { status: 400 });
    }

    const key = `${playerName.toLowerCase().trim()}`;

    try {
      const raw = await store.get(key);
      if (!raw) {
        return new Response(JSON.stringify({ error: "No save found", code: "NOT_FOUND" }), { status: 404 });
      }

      const saveData = JSON.parse(raw);

      // Verify secret code
      if (saveData.secretCode !== secretCode) {
        return new Response(JSON.stringify({ error: "Wrong secret code", code: "WRONG_CODE" }), { status: 403 });
      }

      return new Response(JSON.stringify({
        success: true,
        progress: saveData.progress,
        lastSaved: saveData.lastSaved,
        savedFrom: saveData.savedFrom,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: "Failed to load save", message: error.message }), { status: 500 });
    }
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { playerName, secretCode, progress, device } = body;

      if (!playerName || !secretCode || !progress) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
      }

      if (playerName.length < 2 || playerName.length > 20) {
        return new Response(JSON.stringify({ error: "Name must be 2-20 characters" }), { status: 400 });
      }

      if (secretCode.length < 3 || secretCode.length > 30) {
        return new Response(JSON.stringify({ error: "Secret code must be 3-30 characters" }), { status: 400 });
      }

      const key = `${playerName.toLowerCase().trim()}`;

      // Check if save exists and verify ownership
      const existing = await store.get(key);
      if (existing) {
        const existingData = JSON.parse(existing);
        if (existingData.secretCode !== secretCode) {
          return new Response(JSON.stringify({ error: "That player name is taken! Try a different one.", code: "NAME_TAKEN" }), { status: 409 });
        }
      }

      const saveData = {
        playerName: playerName.trim(),
        secretCode,
        progress,
        lastSaved: new Date().toISOString(),
        savedFrom: device || "unknown",
      };

      await store.set(key, JSON.stringify(saveData));

      return new Response(JSON.stringify({
        success: true,
        lastSaved: saveData.lastSaved,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: "Failed to save", message: error.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config: Config = {
  path: "/api/cloud-save",
};
