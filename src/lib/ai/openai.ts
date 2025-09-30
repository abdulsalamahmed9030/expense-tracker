// src/lib/ai/openai.ts
import {
  AIProvider,
  ReportSummaryInput,
  CategorySuggestInput,
  BudgetCoachInput,
  DuplicatesInput,
  NLFilterInput,
  NLFilterResult,
  CategorySuggestResult,
  DuplicatesResult,
  sanitizeText,
  safeJson,
} from "./provider";

/**
 * Minimal OpenAI adapter using fetch.
 * Expects OPENAI_API_KEY and a Responses/Chat-compatible endpoint.
 * NOTE: Kept intentionally simple; handle parsing robustly in Phase 9 if you enable it.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  private apiKey = process.env.OPENAI_API_KEY;

  private get headers() {
    if (!this.apiKey) {
      throw new Error(
        "OPENAI_API_KEY is missing. Set it in .env.local before using AI_PROVIDER=openai."
      );
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  // Generic caller that returns text
  private async callJSON<T>(system: string, user: string): Promise<T> {
    // Using a generic chat completions-like shape for forward compatibility.
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        model: "gpt-4o-mini", // cheap, fast; change as needed later
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const content: string =
      json?.choices?.[0]?.message?.content ?? "{}";

    const parsed = safeJson<T>(content);
    if (!parsed) {
      throw new Error("OpenAI returned non-JSON response.");
    }
    return parsed;
  }

  async summarizeReport(input: ReportSummaryInput): Promise<string> {
    const system = "You are a concise finance assistant. Reply with a short paragraph.";
    const user = JSON.stringify({ task: "summarizeReport", input });
    // For summaries, we can just return a string, but we keep a JSON contract for uniformity.
    const data = await this.callJSON<{ text: string }>(system, user);
    return data.text ?? "";
  }

  async suggestCategory(input: CategorySuggestInput): Promise<CategorySuggestResult> {
    const system = "Return JSON: {\"categoryName\": string, \"confidence\": number}";
    const user = JSON.stringify({
      task: "suggestCategory",
      note: sanitizeText(input.note, 300),
      candidates: input.candidates ?? [],
    });
    return this.callJSON<CategorySuggestResult>(system, user);
  }

  async budgetCoach(input: BudgetCoachInput): Promise<string> {
    const system = "Return JSON: {\"text\": string}. Keep it actionable and brief.";
    const user = JSON.stringify({ task: "budgetCoach", input });
    const data = await this.callJSON<{ text: string }>(system, user);
    return data.text ?? "";
  }

  async findDuplicates(input: DuplicatesInput): Promise<DuplicatesResult> {
    const system = "Return JSON: {\"ids\": string[]}.";
    const safeTx = input.transactions.map(t => ({
      id: t.id,
      amount: t.amount,
      note: sanitizeText(t.note ?? "", 120),
      occurred_at: t.occurred_at,
    }));
    const user = JSON.stringify({ task: "findDuplicates", transactions: safeTx });
    return this.callJSON<DuplicatesResult>(system, user);
  }

  async nlFilterToQuery(input: NLFilterInput): Promise<NLFilterResult> {
    const system = "Return JSON: {\"type?\":\"income|expense\",\"categoryId?\":string,\"from?\":string,\"to?\":string,\"maxAmount?\":number}";
    const user = JSON.stringify({ task: "nlFilterToQuery", text: sanitizeText(input.text, 200) });
    return this.callJSON<NLFilterResult>(system, user);
  }
}

export const openaiAI = new OpenAIProvider();
