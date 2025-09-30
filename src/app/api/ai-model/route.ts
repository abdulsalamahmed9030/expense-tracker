// src/app/api/ai-model/route.ts
import { NextResponse } from "next/server";
import { getAI } from "@/lib/ai/router";
import type { AIProvider } from "@/lib/ai/provider";

// Extend AIProvider only for Gemini to expose modelName
interface GeminiLike extends AIProvider {
  modelName?: string;
}

export async function GET() {
  const ai = (await getAI()) as GeminiLike;

  return NextResponse.json({
    provider: ai.name,
    modelEnv: process.env.GEMINI_MODEL ?? null,
    modelInUse: ai.modelName ?? null,
  });
}
