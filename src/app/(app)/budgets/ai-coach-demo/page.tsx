import AICoach from "@/components/budgets/ai-coach";

export const dynamic = "force-dynamic";

export default function AICoachDemo() {
  const month = 9;
  const year = 2025;
  const budgets = [
    { category: "Food", planned: 10000, actual: 12500 },
    { category: "Transport", planned: 3000, actual: 2800 },
    { category: "Utilities", planned: 4000, actual: 4200 },
  ];

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Budgets — AI Coach Demo</h1>
      <p className="text-sm text-muted-foreground">
        This uses the mock provider. On the real page, pass your actual monthly budgets.
      </p>

      <AICoach month={month} year={year} budgets={budgets} />
    </main>
  );
}
