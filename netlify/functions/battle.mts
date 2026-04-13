import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      playerMonster,
      opponentMonster,
      battleFocus,
      map,
      booster,
      round,        // 0 = intro, 1-3 = rounds, 4 = finale
      playerChoice,  // 'attack' | 'special' | 'defend' | 'terrain'
      battleHistory, // array of previous round narrations
      playerHP,
      opponentHP,
    } = body;

    const systemPrompt = `You are the narrator of KAIJU CLASH QUEST, an epic monster battle game for a very smart 8-year-old Godzilla expert named Alfred. You know EVERYTHING about Godzilla — every era, every movie, every monster, every ability. Your narrations should be:

- EXCITING and cinematic, like a Godzilla movie scene
- ACCURATE to actual kaiju lore (Alfred will notice if you get it wrong!)
- AGE APPROPRIATE — thrilling but not scary or gory
- Use the monster's actual special abilities and fighting styles
- Factor in terrain advantages — who has the edge on this map?
- Keep each narration to 2-3 punchy sentences
- Use sound effects like BOOM, CRASH, WHOOSH in caps
- Reference real Godzilla movie moments when relevant

CRITICAL RULES:
- You must respond ONLY with valid JSON, no markdown, no backticks
- The battle outcome should feel fair based on stats, terrain, abilities, and player choices
- Smart choices (using terrain, defending at the right time) should help the player
- The player's monster should NOT always win — losses should feel dramatic and educational
- Booster effects should be mentioned when active`;

    let userPrompt = "";

    if (round === 0) {
      // INTRO ROUND
      userPrompt = `Generate the battle intro. Here are the details:

PLAYER MONSTER: ${playerMonster.name} — "${playerMonster.title}"
Era: ${playerMonster.era}
Stats: Speed ${playerMonster.stats.speed}, Strength ${playerMonster.stats.strength}, Defense ${playerMonster.stats.defense}, Special ${playerMonster.stats.specialAttack}
Special Ability: ${playerMonster.specialAbility.name} (${playerMonster.specialAbility.type}) — ${playerMonster.specialAbility.description}
Terrain Bonuses: ${(playerMonster.terrainBonus || []).join(", ") || "none"}
Strengths: ${(playerMonster.strengths || []).join(", ")}
Weaknesses: ${(playerMonster.weaknesses || []).join(", ")}

OPPONENT MONSTER: ${opponentMonster.name} — "${opponentMonster.title}"
Era: ${opponentMonster.era}
Stats: Speed ${opponentMonster.stats.speed}, Strength ${opponentMonster.stats.strength}, Defense ${opponentMonster.stats.defense}, Special ${opponentMonster.stats.specialAttack}
Special Ability: ${opponentMonster.specialAbility.name} (${opponentMonster.specialAbility.type}) — ${opponentMonster.specialAbility.description}
Terrain Bonuses: ${(opponentMonster.terrainBonus || []).join(", ") || "none"}

BATTLEFIELD: ${map.name} (${map.terrain} terrain) — ${map.description}
BATTLE FOCUS: ${battleFocus}
${booster ? `BOOSTER ACTIVE: ${booster.name} — ${booster.description}` : "NO BOOSTER"}

Respond with this exact JSON structure:
{
  "narration": "The epic intro narration (2-3 exciting sentences setting the scene)",
  "playerHP": 100,
  "opponentHP": 100,
  "choices": ["attack", "special", "defend", "terrain"],
  "choiceDescriptions": {
    "attack": "A short description of what attacking means for this monster",
    "special": "A short description of using ${playerMonster.specialAbility.name}",
    "defend": "A short description of defending",
    "terrain": "A short description of using the ${map.terrain} terrain"
  },
  "battleOver": false
}`;
    } else if (round >= 1 && round <= 3) {
      // COMBAT ROUNDS
      userPrompt = `Generate round ${round} of the battle.

PLAYER: ${playerMonster.name} (HP: ${playerHP}/100)
Stats: Speed ${playerMonster.stats.speed}, Strength ${playerMonster.stats.strength}, Defense ${playerMonster.stats.defense}, Special ${playerMonster.stats.specialAttack}
Special Ability: ${playerMonster.specialAbility.name} — ${playerMonster.specialAbility.description}
Terrain Bonuses: ${(playerMonster.terrainBonus || []).join(", ") || "none"}

OPPONENT: ${opponentMonster.name} (HP: ${opponentHP}/100)
Stats: Speed ${opponentMonster.stats.speed}, Strength ${opponentMonster.stats.strength}, Defense ${opponentMonster.stats.defense}, Special ${opponentMonster.stats.specialAttack}
Special Ability: ${opponentMonster.specialAbility.name} — ${opponentMonster.specialAbility.description}
Terrain Bonuses: ${(opponentMonster.terrainBonus || []).join(", ") || "none"}

BATTLEFIELD: ${map.name} (${map.terrain})
BATTLE FOCUS: ${battleFocus}
${booster ? `BOOSTER: ${booster.name} (+${booster.power} ${booster.effect})` : "NO BOOSTER"}

PLAYER CHOSE: ${playerChoice}

PREVIOUS ROUNDS:
${(battleHistory || []).map((h: string, i: number) => `Round ${i}: ${h}`).join("\n") || "None yet"}

Calculate damage based on:
- The player's choice effectiveness (special attacks do more but leave you open; defend reduces incoming damage; terrain use gives bonus if monster has terrain advantage)
- Monster stats comparison for the battle focus trait
- Some randomness (10-25 damage range, modified by stats and choices)
- Booster bonus if applicable
- Terrain advantages

Respond with this exact JSON structure:
{
  "narration": "What happens this round (2-3 exciting sentences)",
  "playerDamage": <number 0-30 damage TAKEN by player>,
  "opponentDamage": <number 0-30 damage TAKEN by opponent>,
  "playerHP": <updated player HP>,
  "opponentHP": <updated opponent HP>,
  "choices": ["attack", "special", "defend", "terrain"],
  "choiceDescriptions": {
    "attack": "Short description",
    "special": "Short description",
    "defend": "Short description",
    "terrain": "Short description"
  },
  "battleOver": false,
  "criticalHit": <true if someone landed a huge blow>
}`;
    } else {
      // FINALE (round 4 or HP depleted)
      const playerWins = (playerHP || 50) > (opponentHP || 50);
      userPrompt = `Generate the EPIC FINALE of this battle!

PLAYER: ${playerMonster.name} (HP: ${playerHP}/100)
OPPONENT: ${opponentMonster.name} (HP: ${opponentHP}/100)
BATTLEFIELD: ${map.name}
PLAYER CHOSE: ${playerChoice}

PREVIOUS ROUNDS:
${(battleHistory || []).map((h: string, i: number) => `Round ${i}: ${h}`).join("\n")}

The ${playerWins ? "player" : "opponent"} wins based on remaining HP.

Respond with this exact JSON structure:
{
  "narration": "The dramatic finale narration (3-4 sentences, make it EPIC)",
  "winner": "${playerWins ? "player" : "opponent"}",
  "playerHP": ${Math.max(0, playerHP || 0)},
  "opponentHP": ${Math.max(0, opponentHP || 0)},
  "battleOver": true,
  "victoryQuote": "A dramatic one-liner from the winning monster"
}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      return new Response(JSON.stringify({ error: "AI battle engine error", details: errorText }), { status: 502 });
    }

    const data = await response.json();
    const text = data.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    // Parse the JSON response, stripping any markdown fences
    const clean = text.replace(/```json|```/g, "").trim();
    const battleResult = JSON.parse(clean);

    return new Response(JSON.stringify(battleResult), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Battle function error:", error);
    return new Response(JSON.stringify({ error: "Battle engine failed", message: error.message }), { status: 500 });
  }
};

export const config: Config = {
  path: "/api/battle",
};
