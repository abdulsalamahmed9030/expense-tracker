// src/app/api/ai-ping/route.ts
import { NextResponse } from "next/server";
import { getAI } from "@/lib/ai/router";
import type { AIProvider } from "@/lib/ai/provider";

export async function GET() {
  try {
    const ai: AIProvider = await getAI();
    // Minimal JSON round-trip
    const res = await ai.nlFilterToQuery({
      text: "groceries last month under 2000 expense",
    });

    return NextResponse.json({
      ok: true,
      provider: ai.name,
      res,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
