// Fix: Add GenerateContentResponse to correctly type API responses.
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { Slime, SlimeStats } from "../types";

// As per guidelines, API key is handled externally.
const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });
const hasAiKey = Boolean(apiKey && apiKey !== 'undefined');

async function* localCommentary(text: string): AsyncGenerator<GenerateContentResponse> {
    // The battle UI consumes only `.text`; this keeps the game playable in an
    // offline build instead of repeatedly attempting an unauthenticated request.
    yield { text } as GenerateContentResponse;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A wrapper function to retry an async operation with exponential backoff.
 * This is useful for handling rate-limiting errors from APIs.
 * @param fn The async function to execute.
 * @param retries The maximum number of retries.
 * @param initialDelay The initial delay in milliseconds.
 * @returns The result of the async function.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 7, initialDelay = 4000): Promise<T> {
    let lastError: Error | undefined;
    let currentDelay = initialDelay;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const isRateLimitError = error.toString().includes('429') || error.toString().includes('RESOURCE_EXHAUSTED');

            if (isRateLimitError) {
                if (attempt < retries - 1) {
                    console.warn(`Rate limit hit. Retrying in ${currentDelay}ms... (Attempt ${attempt + 1}/${retries})`);
                    await delay(currentDelay);
                    // Add some jitter to avoid thundering herd problem
                    currentDelay = currentDelay * 2 + Math.floor(Math.random() * 500);
                }
            } else {
                // Not a retriable error, fail fast.
                console.error("API call failed for a non-retriable reason.", error);
                throw error;
            }
        }
    }

    // If we've exhausted all retries for a rate limit error
    console.error("API call failed after exhausting all retries for rate limit.", lastError);
    throw lastError; // This will be the last error received.
}


// Fix: Add explicit return type to ensure the caller knows it's an async iterable.
// Fix: Use AsyncGenerator<GenerateContentResponse> for the stream type, as `Streamable` is not a valid export.
export async function getBattleCommentaryStream(battleEvent: string): Promise<AsyncGenerator<GenerateContentResponse>> {
    if (!hasAiKey) return localCommentary(`Barnaby calls it: ${battleEvent}`);
    // Per guidelines, use generateContentStream for streaming responses.
    // Wrap the API call with the retry logic.
    return withRetry(() => ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: `You are Barnaby 'The Beastmaster' Beauchamp, a witty MMA-style commentator for a retro monster battle. The following event just occurred: "${battleEvent}". Provide a short, punchy, and funny line of commentary about the action. Keep it to one or two sentences maximum.`,
        config: {
            // Per guidelines, disable thinking for low latency use cases like game commentary.
            thinkingConfig: { thinkingBudget: 0 }
        }
    }));
}

export async function generateBattleSummary(playerName: string, battleLog: string): Promise<AsyncGenerator<GenerateContentResponse>> {
    if (!hasAiKey) return localCommentary(`${playerName} leaves a trail of heroic slime across the arena. The final bell rings after a wild exchange of attacks, buffs, and lucky breaks!`);
    const prompt = `
      You are Barnaby 'The Beastmaster' Beauchamp, a witty MMA-style commentator for a retro monster battle.
      The battle featuring the player's slime, "${playerName}", has just concluded.
      The following is the turn-by-turn log of the battle:
      --- BATTLE LOG ---
      ${battleLog}
      --- END LOG ---
      Write a short, exciting, and personalized summary of the fight (2-3 paragraphs max). 
      Highlight a key turning point, a critical moment, or a particularly skillful or lucky play. 
      Maintain your bombastic commentator persona. Address the player's slime, ${playerName}, directly.
    `;
    return withRetry(() => ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: prompt,
    }));
}


export async function generateOpponent(playerSlime: Slime): Promise<{name: string, stats: SlimeStats}> {
    const fallbackOpponent = () => ({
        name: "Glitched Goo",
        stats: {
            HP: Math.max(10, Math.floor(playerSlime.stats.HP * 0.9)),
            ATK: Math.max(1, playerSlime.stats.ATK - 1),
            DEF: Math.max(1, playerSlime.stats.DEF - 1),
            SPD: playerSlime.stats.SPD,
            LUK: playerSlime.stats.LUK,
        }
    });
    if (!hasAiKey) return fallbackOpponent();
    try {
        // Per guidelines, use generateContent for single-turn responses.
        // The API call is now wrapped with retry logic.
        // Fix: Explicitly type the response to avoid it being inferred as 'unknown'.
        const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a slime opponent for a player slime that is level ${playerSlime.level}. The opponent should be a fun challenge but winnable. The opponent's name should be creative and slime-themed. Base its stats on the player's stats: HP=${playerSlime.stats.HP}, ATK=${playerSlime.stats.ATK}, DEF=${playerSlime.stats.DEF}, SPD=${playerSlime.stats.SPD}, LUK=${playerSlime.stats.LUK}. Return only a JSON object.`,
            config: {
                // Per guidelines, use responseMimeType and responseSchema for JSON output.
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: {
                            type: Type.STRING,
                            description: "A creative, slime-themed name for the opponent slime."
                        },
                        stats: {
                            type: Type.OBJECT,
                            properties: {
                                HP: { type: Type.INTEGER, description: "Health points, balanced against player." },
                                ATK: { type: Type.INTEGER, description: "Attack power, balanced against player." },
                                DEF: { type: Type.INTEGER, description: "Defense power, balanced against player." },
                                SPD: { type: Type.INTEGER, description: "Speed, balanced against player." },
                                LUK: { type: Type.INTEGER, description: "Luck, balanced against player." }
                            },
                            required: ["HP", "ATK", "DEF", "SPD", "LUK"]
                        }
                    },
                    required: ["name", "stats"]
                }
            }
        }));

        // Per guidelines, access text output via the .text property.
        const jsonText = response.text.trim();
        const opponentData = JSON.parse(jsonText);
        // Basic validation
        if (opponentData.name && opponentData.stats &&
            typeof opponentData.stats.HP === 'number' &&
            typeof opponentData.stats.ATK === 'number' &&
            typeof opponentData.stats.DEF === 'number' &&
            typeof opponentData.stats.SPD === 'number' &&
            typeof opponentData.stats.LUK === 'number') {
            return opponentData;
        } else {
            throw new Error("Invalid opponent data structure from Gemini.");
        }
    } catch (e) {
        let errorContext = e instanceof Error ? e.message : String(e);
        console.error(`Failed to generate opponent from Gemini: ${errorContext}. Providing fallback.`);
        // Fallback opponent in case of API or parsing error
        return fallbackOpponent();
    }
}
