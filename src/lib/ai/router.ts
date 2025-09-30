// src/lib/ai/router.ts
import type { AIProvider } from "./provider";
import { mockAI } from "./default";

// Cache a singleton provider instance
let cached: AIProvider | null = null;

/**
 * Picks an AI provider based on AI_PROVIDER env var.
 * Uses dynamic import() for optional adapters to satisfy ESLint.
 */
export async function getAI(): Promise<AIProvider> {
  if (cached) return cached;

  const choice = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (choice === "mock") {
    cached = mockAI;
    return cached;
  }

  if (choice === "openai") {
    try {
      const mod = await import("./openai");
      cached = mod.openaiAI;
      return cached;
    } catch (err) {
      console.warn("[AI] Failed to load OpenAI adapter. Falling back to mock.", err);
      cached = mockAI;
      return cached;
    }
  }

  if (choice === "gemini") {
    try {
      const mod = await import("./gemini");
      // IMPORTANT: use geminiProvider (not geminiAI) to avoid export drift
      cached = mod.geminiProvider;
      return cached;
    } catch (err) {
      console.warn("[AI] Failed to load Gemini adapter. Falling back to mock.", err);
      cached = mockAI;
      return cached;
    }
  }

  console.warn(`[AI] Unknown AI_PROVIDER="${choice}". Falling back to mock.`);
  cached = mockAI;
  return cached;
}
