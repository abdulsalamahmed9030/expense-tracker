// Lightweight PDF generator for the Reports page
// Uses jsPDF + autoTable. No charts snapshot (Recharts is SVG).
import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

export type ReportKpis = {
  income: number;
  expense: number;
  net: number;
  count: number;
};

export type ReportCategoryRow = {
  name: string;
  amount: number;
};

export type ReportTxRow = {
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note?: string | null;
};

// Extend jsPDF with just what we need (no `any`)
type AutoTableDoc = jsPDF & {
  lastAutoTable?: { finalY: number };
  internal: {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
  };
};

// Indian-style number formatting
const formatINR = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function generateReportPDF(opts: {
  title?: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  kpis: ReportKpis;
  categories: ReportCategoryRow[];
  transactions: ReportTxRow[];
}) {
  const {
    title = "Expense Tracker Report",
    from,
    to,
    kpis,
    categories,
    transactions,
  } = opts;

  const base = new jsPDF({ unit: "pt", compress: true });
  const doc: AutoTableDoc = base as AutoTableDoc;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Range: ${from} → ${to}`, 40, 60);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 75);

  // KPI table
  autoTable(doc, {
    startY: 95,
    styles: { fontSize: 10 },
    head: [["Income", "Expense", "Net", "# Transactions"]],
    body: [
      [
        `Rs ${formatINR(kpis.income)}`,
        `Rs ${formatINR(kpis.expense)}`,
        `Rs ${formatINR(kpis.net)}`,
        `${kpis.count}`,
      ],
    ],
  } as UserOptions);

  const nextY1 = (doc.lastAutoTable?.finalY ?? 95) + 20;

  // Category breakdown (expenses only)
  autoTable(doc, {
    startY: nextY1,
    styles: { fontSize: 10 },
    head: [["Category", "Amount"]],
    body: categories.map((c) => [c.name, `Rs ${formatINR(c.amount)}`]),
    didDrawPage: (data) => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Category Breakdown (Expenses)", 40, data.settings.startY - 8);
    },
  } as UserOptions);

  const nextY2 = (doc.lastAutoTable?.finalY ?? nextY1) + 20;

  // Transactions (limit rows for performance)
  const MAX_ROWS = 500;
  const txRows = transactions.slice(0, MAX_ROWS).map((t) => [
    t.date,
    t.type,
    t.category,
    `Rs ${formatINR(Number(t.amount))}`,
    t.note ?? "",
  ]);

  autoTable(doc, {
    startY: nextY2,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [238, 238, 238], textColor: 20 },
    head: [["Date", "Type", "Category", "Amount", "Note"]],
    body: txRows,
    didDrawPage: (data) => {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Transactions", 40, data.settings.startY - 8);
    },
  } as UserOptions);

  if (transactions.length > MAX_ROWS) {
    const tailY = (doc.lastAutoTable?.finalY ?? nextY2) + 16;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Only first ${MAX_ROWS} rows shown (out of ${transactions.length}). Refine your filters to export all.`,
      40,
      tailY
    );
  }

  // Footer page numbers — typed via `internal.pageSize`
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    doc.text(`Page ${i} / ${pageCount}`, width - 60, height - 20);
  }

  const filename = `ExpenseReport_${from}_to_${to}.pdf`;
  doc.save(filename);
}
