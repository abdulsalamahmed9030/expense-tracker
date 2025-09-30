import AIReportSummary from "@/components/reports/ai-report-summary";

export const dynamic = "force-dynamic";

export default function AISummaryDemo() {
  const from = "2025-09-01";
  const to = "2025-09-30";
  const income = 100000;
  const expense = 82000;
  const net = income - expense;
  const count = 145;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Reports — AI Summary Demo</h1>
      <p className="text-sm text-muted-foreground">
        This uses the mock provider and your server action. On your real Reports page, pass the actual KPIs/date range.
      </p>
      <AIReportSummary
        from={from}
        to={to}
        income={income}
        expense={expense}
        net={net}
        count={count}
      />
    </main>
  );
}
