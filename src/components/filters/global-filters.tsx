"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | "income" | "expense";

export type FiltersState = {
  from: string;        // yyyy-MM-dd
  to: string;          // yyyy-MM-dd
  type: TypeFilter;
  categoryId: string;  // "" = all
};

export function GlobalFilters({
  categories = [],
  onChange,
  initial,
}: {
  categories?: { id: string; name: string }[];
  onChange?: (next: FiltersState) => void;
  initial?: Partial<FiltersState>;
}) {
  // sensible defaults: this month
  const today = useMemo(() => new Date(), []);
  const defaultFrom = format(startOfMonth(today), "yyyy-MM-dd");
  const defaultTo = format(endOfMonth(today), "yyyy-MM-dd");

  const [state, setState] = useState<FiltersState>({
    from: initial?.from ?? defaultFrom,
    to: initial?.to ?? defaultTo,
    type: initial?.type ?? "all",
    categoryId: initial?.categoryId ?? "",
  });

  useEffect(() => {
    onChange?.(state);
  }, [state, onChange]);

  const quickSet = (key: "thisMonth" | "last30" | "last7") => {
    const now = new Date();
    if (key === "thisMonth") {
      setState((s) => ({
        ...s,
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      }));
    } else if (key === "last30") {
      setState((s) => ({
        ...s,
        from: format(subDays(now, 29), "yyyy-MM-dd"),
        to: format(now, "yyyy-MM-dd"),
      }));
    } else if (key === "last7") {
      setState((s) => ({
        ...s,
        from: format(subDays(now, 6), "yyyy-MM-dd"),
        to: format(now, "yyyy-MM-dd"),
      }));
    }
  };

  const setType = (t: TypeFilter) => setState((s) => ({ ...s, type: t }));
  const setCategory = (id: string) => setState((s) => ({ ...s, categoryId: id }));

  return (
    <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
      {/* Mobile-first: stack groups; desktop: inline row */}
      <div className="flex flex-col gap-3 sm:gap-3 md:flex-row md:flex-wrap md:items-center">
        {/* Quick ranges */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 md:gap-2">
          <span className="text-sm text-muted-foreground">Quick:</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => quickSet("thisMonth")}
              className={cn(
                "rounded-xl whitespace-nowrap",
                state.from === format(startOfMonth(today), "yyyy-MM-dd") &&
                  state.to === format(endOfMonth(today), "yyyy-MM-dd") &&
                  "ring-1 ring-primary"
              )}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => quickSet("last30")}
              className="rounded-xl whitespace-nowrap"
            >
              Last 30 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => quickSet("last7")}
              className="rounded-xl whitespace-nowrap"
            >
              Last 7 days
            </Button>
          </div>
        </div>

        {/* Divider shows only ≥ sm and when in a row */}
        <Separator orientation="horizontal" className="sm:hidden" />
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        {/* Date inputs */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From</span>
            <Input
              type="date"
              value={state.from}
              onChange={(e) => setState((s) => ({ ...s, from: e.target.value }))}
              className="h-9 w-full rounded-xl sm:w-40 md:w-[150px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">To</span>
            <Input
              type="date"
              value={state.to}
              onChange={(e) => setState((s) => ({ ...s, to: e.target.value }))}
              className="h-9 w-full rounded-xl sm:w-40 md:w-[150px]"
            />
          </div>
        </div>

        <Separator orientation="horizontal" className="sm:hidden" />
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        {/* Type */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-sm text-muted-foreground">Type</span>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={state.type === "all" ? "default" : "outline"}
              onClick={() => setType("all")}
              className="rounded-xl"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={state.type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className="rounded-xl"
            >
              Income
            </Button>
            <Button
              size="sm"
              variant={state.type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
              className="rounded-xl"
            >
              Expense
            </Button>
          </div>
        </div>

        <Separator orientation="horizontal" className="sm:hidden" />
        <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

        {/* Category */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center md:ml-auto">
          <span className="text-sm text-muted-foreground">Category</span>
          <select
            value={state.categoryId}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-full rounded-xl border bg-background px-3 text-sm sm:w-56 md:w-64"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
