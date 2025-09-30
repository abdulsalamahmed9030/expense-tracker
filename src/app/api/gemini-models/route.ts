// src/app/api/gemini-models/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 400 });
  }

  // Use v1 here to match the adapter
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(
    key
  )}`;

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
