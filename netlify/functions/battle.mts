import type { Context, Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

/**
 * POST /api/battle — the AI NARRATOR.
 *
 * The outcome of every round is decided locally in src/lib/battleEngine.ts and sent
 * here as "beats". This function only writes the movie-trailer caption for what already
 * happened, so a slow or missing API key can never stall or change a fight. The client
 * shows its own fallback caption immediately and swaps in this text when it arrives.
 *
 * Response: { narration: string, source: "ai" }  — plain text, 1-3 sentences.
 */

interface BeatIn { actor: string; action: string; damage?: number; counter?: number; crit?: boolean; blocked?: boolean; missed?: boolean; terrainBoost?: boolean; terrainFlop?: boolean; abilityName?: string }

const SYSTEM = `You are the narrator of KAIJU CLASH QUEST, a monster battle video game made for a very smart 8-year-old Godzilla expert named Alfred. You know every Godzilla era, movie, kaiju and ability, and Alfred will notice if you get lore wrong.

Write ONLY the caption for the moment described — 1 to 3 punchy sentences, cinematic like a Godzilla movie scene. Use sound effects in caps (BOOM, CRASH, WHOOSH). Thrilling, never gory or scary. Reference real Godzilla movie moments when they fit. Never change the facts you are given (who hit whom, how hard, who won). Do not add headings, quotes, JSON or markdown — just the sentences.`;

function describeBeats(beats: BeatIn[], playerName: string, opponentName: string): string {
  return beats.map((b) => {
    const who = b.actor === "player" ? playerName : opponentName;
    const target = b.actor === "player" ? opponentName : playerName;
    if (b.action === "defend") return `${who} defended${b.counter ? ` and countered ${target} for ${b.counter} damage` : ""}.`;
    const move = b.action === "special" ? `used ${b.abilityName || "its special ability"}` : b.action === "terrain" ? `used the terrain${b.terrainBoost ? " (home-ground advantage)" : b.terrainFlop ? " (unfamiliar ground, weak)" : ""}` : "attacked";
    if (b.missed) return `${who} ${move} but MISSED.`;
    return `${who} ${move} and hit ${target} for ${b.damage} damage${b.crit ? " — CRITICAL HIT" : ""}${b.blocked ? " (partly blocked)" : ""}${b.counter ? `, taking ${b.counter} counter damage` : ""}.`;
  }).join(" ");
}

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return Response.json({ error: "Narrator not configured (ANTHROPIC_API_KEY missing)", source: "none" }, { status: 503 });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Body must be JSON" }, { status: 400 }); }

  const { phase, player, opponent, map, focus, booster, round, beats, playerHP, opponentHP, winner, history } = body || {};
  if (!player?.name || !opponent?.name || !map?.name) return Response.json({ error: "player, opponent and map are required" }, { status: 400 });

  const fighter = (m: any) => `${m.name} — "${m.title || ""}" (${m.era || "unknown era"}). Special: ${m.specialAbility?.name || "?"} (${m.specialAbility?.type || "?"}) — ${m.specialAbility?.description || ""}. Strengths: ${(m.strengths || []).join(", ") || "n/a"}. Weaknesses: ${(m.weaknesses || []).join(", ") || "n/a"}.`;

  const context = [
    `PLAYER (Alfred's monster): ${fighter(player)}`,
    `OPPONENT: ${fighter(opponent)}`,
    `BATTLEFIELD: ${map.name} (${map.terrain}) — ${map.description || ""}`,
    focus ? `BATTLE FOCUS: ${focus}` : "",
    booster ? `BOOSTER ACTIVE for the player: ${booster.name} — ${booster.description}` : "",
    Array.isArray(history) && history.length ? `EARLIER: ${history.slice(-3).join(" ")}` : "",
  ].filter(Boolean).join("\n");

  let ask: string;
  if (phase === "intro") {
    ask = `${context}\n\nWrite the opening caption as the two titans face off. Set the scene on this battlefield.`;
  } else if (phase === "finale") {
    const w = winner === "player" ? player.name : winner === "opponent" ? opponent.name : "nobody";
    ask = `${context}\n\nFINAL RESULT: ${w === "nobody" ? "It ended in a TIE" : `${w} WINS`}. Player HP ${playerHP}, opponent HP ${opponentHP}.\n\nWrite the epic finale caption (2-3 sentences) and end with one dramatic line the winner would roar.`;
  } else {
    ask = `${context}\n\nROUND ${round || 1}. WHAT HAPPENED (do not change these facts): ${describeBeats(Array.isArray(beats) ? beats : [], player.name, opponent.name)} Player HP now ${playerHP}/100, opponent HP now ${opponentHP}/100.\n\nWrite the caption for this round.`;
  }

  const client = new Anthropic({ apiKey, timeout: 8000, maxRetries: 0 });

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 300,
      output_config: { effort: "low" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: ask }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ error: "Narrator declined", source: "none" }, { status: 502 });
    }

    const narration = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!narration) return Response.json({ error: "Empty narration", source: "none" }, { status: 502 });

    return Response.json({ narration, source: "ai" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    const status = error instanceof Anthropic.APIError && typeof error.status === "number" ? error.status : 502;
    console.error("Narrator error:", error?.message || error);
    return Response.json({ error: "Narrator unavailable", message: error?.message || String(error), source: "none" }, { status: status >= 400 && status < 600 ? status : 502 });
  }
};

export const config: Config = {
  path: "/api/battle",
};
