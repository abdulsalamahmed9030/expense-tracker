"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

export type TrendPoint = { label: string; income: number; expense: number };
export type CategorySlice = { name: string; value: number; color?: string };

/** Full INR with Indian digit grouping */
const formatINR = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Short INR for axis ticks: 1.2K, 3.4L, 2.1Cr */
const formatShortINR = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
};

function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width:${breakpointPx}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [breakpointPx]);
  return isMobile;
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 8,
          right: isMobile ? 6 : 16,
          bottom: isMobile ? 22 : 12,
          left: isMobile ? 4 : 12,
        }}
      >
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: isMobile ? 10 : 12 }}
          angle={isMobile ? -35 : 0}
          textAnchor={isMobile ? "end" : "middle"}
          height={isMobile ? 40 : 28}
        />
        <YAxis
          tick={{ fontSize: isMobile ? 10 : 12 }}
          width={isMobile ? 36 : 48}
          tickFormatter={formatShortINR}
        />
        <Tooltip
          formatter={(value: ValueType, name: NameType) => [
            `Rs ${formatINR(Number(value))}`,
            name === "income" ? "Income" : "Expense",
          ]}
          labelFormatter={(l: string) => `Month: ${l}`}
          wrapperStyle={{ outline: "none" }}
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#10b981"
          strokeWidth={2}
          dot={isMobile ? false : { r: 2 }}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#ef4444"
          strokeWidth={2}
          dot={isMobile ? false : { r: 2 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie({ data }: { data: CategorySlice[] }) {
  const isMobile = useIsMobile();
  const showSliceLabels = !isMobile;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={isMobile ? 90 : 110}
          label={showSliceLabels}
          labelLine={showSliceLabels}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color || "#9ca3af"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: ValueType, name: NameType) => [
            `Rs ${formatINR(Number(value))}`,
            String(name),
          ]}
          wrapperStyle={{ outline: "none" }}
        />
        <Legend
          verticalAlign={isMobile ? "bottom" : "middle"} // ✅ valid values
          align={isMobile ? "center" : "right"}
          layout={isMobile ? "horizontal" : "vertical"}
          wrapperStyle={{ fontSize: isMobile ? 11 : 12, paddingTop: isMobile ? 6 : 0 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
