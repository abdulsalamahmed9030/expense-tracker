// src/app/api/ai-provider/route.ts
import { NextResponse } from "next/server";
import { getAI } from "@/lib/ai/router";

export const dynamic = "force-dynamic";

export async function GET() {
  const ai = await getAI(); // <- await the async getter
  console.log("[AI] Active provider:", ai.name);
  return NextResponse.json({ provider: ai.name });
}
