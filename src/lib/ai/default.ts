// src/lib/ai/default.ts
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
  clamp,
  truncate,
} from "./provider";

/**
 * Deterministic, zero-cost mock provider.
 * No network calls. Works offline. Great for local dev, tests, and demos.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async summarizeReport(input: ReportSummaryInput): Promise<string> {
    const { from, to, income, expense, net, count } = input;
    const burn = income > 0 ? (expense / Math.max(1, income)) * 100 : 0;
    const direction = net >= 0 ? "surplus" : "deficit";
    // Deterministic summary — no randomness.
    return [
      `Summary for ${from} → ${to}:`,
      `• Transactions: ${count}`,
      `• Income: ₹${income.toLocaleString("en-IN")}`,
      `• Expense: ₹${expense.toLocaleString("en-IN")} (${burn.toFixed(1)}% of income)`,
      `• Net: ₹${net.toLocaleString("en-IN")} (${direction})`,
      `Tip: Keep fixed costs ≤ 50% of income and discretionary ≤ 30%.`
    ].join(" ");
  }

  async suggestCategory(input: CategorySuggestInput): Promise<CategorySuggestResult> {
    const note = sanitizeText(input.note ?? "", 200).toLowerCase();

    // Simple keyword → category map
    const table: Array<[string[], string]> = [
      [["uber","ola","fuel","petrol","diesel","metro","bus","cab","train","flight","airfare"], "Transport"],
      [["grocery","groceries","swiggy","zomato","restaurant","food","dinner","lunch","breakfast","snacks","cafe"], "Food"],
      [["rent","landlord","lease"], "Rent"],
      [["electricity","power","bescom","tneb","mahavitaran","water","gas","internet","wifi","broadband","mobile","recharge","dth"], "Utilities"],
      [["medicine","pharmacy","doctor","hospital","clinic","lab"], "Health"],
      [["amazon","flipkart","myntra","nykaa","shopping","clothes","apparel","shoes"], "Shopping"],
      [["salary","stipend","payout","freelance","invoice","payment received"], "Income"],
      [["school","tuition","course","udemy","coursera","byju"], "Education"],
      [["emi","loan","interest","credit card"], "Debt"],
      [["gift","donation","charity"], "Gifts/Donations"],
    ];

    let best: { name: string; score: number } = { name: "Other", score: 0.1 };
    for (const [keys, cat] of table) {
      for (const k of keys) {
        if (note.includes(k)) {
          const score = clamp(k.length / 10, 0.3, 0.95); // longer keyword → higher confidence
          if (score > best.score) best = { name: cat, score };
        }
      }
    }

    // If candidates provided, prefer one that matches best.name
    if (input.candidates?.length) {
      const hit = input.candidates.find(
        (c) => c.toLowerCase() === best.name.toLowerCase()
      );
      if (hit) return { categoryName: hit, confidence: best.score };
    }

    return { categoryName: best.name, confidence: best.score };
  }

  async budgetCoach(input: BudgetCoachInput): Promise<string> {
    const { month, year, budgets } = input;
    const overs = budgets
      .map((b) => ({ ...b, diff: b.actual - b.planned }))
      .filter((b) => b.diff > 0)
      .sort((a, b) => b.diff - a.diff);

    if (overs.length === 0) {
      return `Nice work for ${month}/${year}! All categories are within budget. Consider increasing savings or debt repayment.`;
    }

    const lines: string[] = [
      `For ${month}/${year}, ${overs.length} categor${overs.length > 1 ? "ies are" : "y is"} over budget.`,
    ];

    for (const o of overs.slice(0, 5)) {
      const overPct = (o.diff / Math.max(1, o.planned)) * 100;
      const nextPlan = Math.max(0, Math.round(o.planned * 0.9)); // suggest 10% tighter next month
      lines.push(
        `• ${o.category}: overspent by ₹${o.diff.toLocaleString("en-IN")} (${overPct.toFixed(
          1
        )}%). Try: cap discretionary, set alerts at 80%, plan next month = ₹${nextPlan.toLocaleString("en-IN")} if feasible.`
      );
    }

    lines.push(
      "General tips: move recurring bills to early-in-month, use category-level alerts at 80/100%, and review weekly."
    );
    return lines.join(" ");
  }

  async findDuplicates(input: DuplicatesInput): Promise<DuplicatesResult> {
    // Heuristic: same rounded amount (+/- 1 rupee tolerance) occurring the same day,
    // and note similarity (prefix match after sanitization).
    const ids = new Set<string>();
    const norm = (s: string | null | undefined) =>
      truncate((s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, "").trim(), 40);

    const byDayAmount = new Map<string, Array<{ id: string; key: string; note: string }>>();

    for (const t of input.transactions) {
      const day = (t.occurred_at || "").slice(0, 10);
      const amt = Math.round(t.amount);
      const key = `${day}:${amt}`;
      const arr = byDayAmount.get(key) ?? [];
      arr.push({ id: t.id, key, note: norm(t.note) });
      byDayAmount.set(key, arr);
    }

    for (const [, arr] of byDayAmount) {
      if (arr.length < 2) continue;
      // Mark duplicates when notes share same first 10 chars
      arr.sort((a, b) => a.note.localeCompare(b.note));
      for (let i = 1; i < arr.length; i++) {
        const prev = arr[i - 1];
        const cur = arr[i];
        if (prev.note.slice(0, 10) === cur.note.slice(0, 10)) {
          ids.add(prev.id);
          ids.add(cur.id);
        }
      }
    }

    return { ids: Array.from(ids) };
  }

  async nlFilterToQuery(input: NLFilterInput): Promise<NLFilterResult> {
    const text = sanitizeText(input.text ?? "", 200).toLowerCase();

    const out: NLFilterResult = {};
    // Type
    if (/\b(income|salary|received)\b/.test(text)) out.type = "income";
    if (/\b(expense|spent|pay|paid|purchase)\b/.test(text)) out.type = "expense";

    // Amount (under/less than/<=)
    const amtMatch = text.match(/\b(?:under|less than|<|<=)\s*([0-9]+)\b/);
    if (amtMatch) out.maxAmount = Number(amtMatch[1]);

    // Relative dates: "last month"
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    if (/\blast month\b/.test(text)) {
      out.from = lastMonth.toISOString().slice(0, 10);
      out.to = lastMonthEnd.toISOString().slice(0, 10);
    }

    // Simple category name sniffing (the caller should map to IDs)
    if (/\b(grocery|groceries|food|restaurant|swiggy|zomato)\b/.test(text)) {
      out.categoryId = "Food"; // return name placeholder; caller can map name → id
    }
    if (/\b(uber|ola|metro|bus|fuel|petrol|diesel)\b/.test(text)) {
      out.categoryId = "Transport";
    }

    return out;
  }
}

export const mockAI = new MockAIProvider();
