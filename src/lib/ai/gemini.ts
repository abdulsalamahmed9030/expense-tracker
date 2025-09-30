// src/lib/ai/gemini.ts
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
 * Gemini adapter with smart fallback and strict JSON handling.
 * - 2.5 / "latest" → try v1beta first; others → try v1 first
 * - On 404/405, retry across (v1beta↔v1) and several model aliases
 * - Uses x-goog-api-key header
 * - Sends system prompt via systemInstruction
 * - Requests JSON via responseMimeType; falls back to parsing fenced/braced JSON if needed
 */

const API_V1 = "https://generativelanguage.googleapis.com/v1";
const API_V1BETA = "https://generativelanguage.googleapis.com/v1beta";

// From your /models listing (stable, no "-latest" preferred first):
const MODEL_POOL = [
  "models/gemini-2.5-flash",
  "models/gemini-2.5-pro",
  "models/gemini-flash-latest",
  "models/gemini-pro-latest",
  "models/gemini-2.0-flash",
];

function pickInitialModel(): string {
  const pinned = process.env.GEMINI_MODEL?.trim();
  return pinned && pinned.length > 0 ? pinned : MODEL_POOL[0];
}

function apiBaseForModel(model: string): string {
  const m = model.toLowerCase();
  // 2.5 & "-latest" models are currently better supported via v1beta in many regions
  if (m.includes("2.5") || m.includes("latest")) return API_V1BETA;
  // Older/stable models typically work on v1
  return API_V1;
}

function extractJsonFromText(text: string): unknown | null {
  const direct = safeJson<unknown>(text);
  if (direct) return direct;

  const fenced = /```json\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1]) {
    const j = safeJson<unknown>(fenced[1]);
    if (j) return j;
  }

  const braced = /(\{[\s\S]*\})/.exec(text);
  if (braced?.[1]) {
    const j = safeJson<unknown>(braced[1]);
    if (j) return j;
  }
  return null;
}

type GenResp = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export class GeminiAIProvider implements AIProvider {
  readonly name = "gemini";
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private model = pickInitialModel();
  private currentApiBase = apiBaseForModel(this.model);

  // Debug helpers used by /api/ai-endpoint
  get modelName() {
    return this.model;
  }
  __debugApiBase = () => this.currentApiBase;
  __debugEndpoint = () => `${this.currentApiBase}/${this.model}:generateContent`;

  private endpoint(model = this.model, apiBase = this.currentApiBase): string {
    if (!this.apiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing. Set it in .env.local (and in prod) before using AI_PROVIDER=gemini."
      );
    }
    // IMPORTANT: do NOT encode the path segment; "models/..." must remain as-is.
    return `${apiBase}/${model}:generateContent`;
  }

  private async rawCall(model: string, apiBase: string, system: string, user: string) {
    return fetch(this.endpoint(model, apiBase), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey as string,
      },
      body: JSON.stringify({
        systemInstruction: {
          role: "system",
          parts: [{ text: system }],
        },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          // v1 uses camelCase for this knob
          responseMimeType: "application/json",
        },
      }),
    });
  }

  /**
   * Fallback strategy:
   * 1) try (current model, base guessed from name)
   * 2) flip base for same model
   * 3) try MODEL_POOL across both bases
   * Abort early on not-version-related failures (e.g., 401/403/429)
   */
  private async callJSON<T>(system: string, user: string): Promise<T> {
    const tried: Array<{ model: string; apiBase: string; status?: number }> = [];
    const order: Array<{ model: string; apiBase: string }> = [];

    // Current model/base first
    order.push({ model: this.model, apiBase: this.currentApiBase });
    // Flip base and try again
    order.push({
      model: this.model,
      apiBase: this.currentApiBase === API_V1 ? API_V1BETA : API_V1,
    });
    // Try pool across both bases
    for (const m of MODEL_POOL) {
      if (m === this.model) continue;
      const base = apiBaseForModel(m);
      order.push({ model: m, apiBase: base });
      order.push({ model: m, apiBase: base === API_V1 ? API_V1BETA : API_V1 });
    }

    let lastBody = "";
    for (const { model, apiBase } of order) {
      const res = await this.rawCall(model, apiBase, system, user);

      if (res.ok) {
        // Lock onto the working pair
        this.model = model;
        this.currentApiBase = apiBase;

        const json = (await res.json()) as GenResp;
        const text =
          json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        const parsed = safeJson<T>(text) ?? (extractJsonFromText(text) as T | null);
        if (!parsed) throw new Error("Gemini returned non-JSON response.");
        return parsed;
      }

      const status = res.status;
      lastBody = await res.text().catch(() => "");
      tried.push({ model, apiBase, status });

      // If it's NOT a version/method mismatch, bubble up immediately
      if (![404, 405].includes(status)) {
        throw new Error(
          `Gemini error ${status}: ${lastBody || "(no body)"} [model=${model} base=${apiBase}]`
        );
      }
    }

    const last = tried[tried.length - 1];
    throw new Error(
      `Gemini error ${last?.status ?? 404}: ${lastBody || "(no body)"} [tried=${tried
        .map((t) => `${t.model}@${t.apiBase.split("/").pop()}`)
        .join(", ")}]`
    );
  }

  async summarizeReport(input: ReportSummaryInput): Promise<string> {
    const system =
      `Return JSON exactly: {"text": string}. ` +
      `Keep it to 2–3 concise finance summary sentences. No extra fields.`;
    const user = JSON.stringify({ task: "summarizeReport", input });
    const data = await this.callJSON<{ text: string }>(system, user);
    return data.text ?? "";
  }

  async suggestCategory(input: CategorySuggestInput): Promise<CategorySuggestResult> {
    const system =
      `Return JSON exactly: {"categoryName": string, "confidence": number}. ` +
      `Category is a single high-level word (Food, Transport, Utilities, Rent, Shopping, Salary, Investment, Misc). No extra fields.`;
    const user = JSON.stringify({
      task: "suggestCategory",
      note: sanitizeText(input.note, 300),
      candidates: input.candidates ?? [],
    });
    return this.callJSON<CategorySuggestResult>(system, user);
  }

  async budgetCoach(input: BudgetCoachInput): Promise<string> {
    const system =
      `Return JSON exactly: {"text": string}. ` +
      `Be an empathetic budgeting coach; under 120 words; actionable next-month adjustments. No extra fields.`;
    const user = JSON.stringify({ task: "budgetCoach", input });
    const data = await this.callJSON<{ text: string }>(system, user);
    return data.text ?? "";
  }

  async findDuplicates(input: DuplicatesInput): Promise<DuplicatesResult> {
    const system = `Return JSON exactly: {"ids": string[]}. No extra fields.`;
    const safeTx = input.transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      note: sanitizeText(t.note ?? "", 120),
      occurred_at: t.occurred_at,
    }));
    const user = JSON.stringify({ task: "findDuplicates", transactions: safeTx });
    return this.callJSON<DuplicatesResult>(system, user);
  }

  async nlFilterToQuery(input: NLFilterInput): Promise<NLFilterResult> {
    const system =
      `Return JSON with any of these fields only: ` +
      `{"type":"income"|"expense","categoryId":string,"from":"YYYY-MM-DD","to":"YYYY-MM-DD","maxAmount":number}. ` +
      `Omit fields you can't infer. No extra fields.`;
    const user = JSON.stringify({ task: "nlFilterToQuery", text: sanitizeText(input.text, 200) });
    return this.callJSON<NLFilterResult>(system, user);
  }
}

export const geminiProvider: AIProvider = new GeminiAIProvider();
export const geminiAI = geminiProvider;
