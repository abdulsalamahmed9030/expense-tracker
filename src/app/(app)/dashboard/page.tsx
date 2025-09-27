"use client";

import { useState } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TrendChart, CategoryPie } from "@/components/dashboard/charts";
import { GlobalFilters, type FiltersState } from "@/components/filters/global-filters";

export default function DashboardPage() {
  const [filters, setFilters] = useState<FiltersState | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <GlobalFilters
        categories={[
          { id: "c1", name: "Food" },
          { id: "c2", name: "Transport" },
          { id: "c3", name: "Rent" },
          { id: "c4", name: "Shopping" },
        ]}
        onChange={setFilters}
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="This Month Spend" value="$1,200" />
        <KpiCard title="This Month Income" value="$2,100" />
        <KpiCard title="Net" value="$900" />
        <KpiCard title="Transactions" value="15" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">Income vs Expense</h2>
          <TrendChart />
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-medium">Spend by Category</h2>
          <CategoryPie />
        </div>
      </div>

      {/* Debug panel (remove later): shows current filters */}
      <pre className="rounded-2xl border bg-muted/40 p-4 text-xs">
        {JSON.stringify(filters, null, 2)}
      </pre>
    </div>
  );
}
