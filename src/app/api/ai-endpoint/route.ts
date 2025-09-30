// src/app/api/ai-endpoint/route.ts
import { NextResponse } from "next/server";
import { getAI } from "@/lib/ai/router";
import type { AIProvider } from "@/lib/ai/provider";

export async function GET() {
  try {
    const ai = (await getAI()) as AIProvider & {
      // we'll rely on optional debug fields if present
      modelName?: string;
      __debugEndpoint?: () => string;
      __debugApiBase?: () => string;
    };

    return NextResponse.json({
      provider: ai.name,
      modelEnv: process.env.GEMINI_MODEL ?? null,
      modelInUse: ai.modelName ?? null,
      apiBase: ai.__debugApiBase ? ai.__debugApiBase() : null,
      endpoint: ai.__debugEndpoint ? ai.__debugEndpoint() : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
