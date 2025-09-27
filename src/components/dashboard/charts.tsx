"use client";

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
} from "recharts";

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

const trendData = [
  { month: "Jan", income: 2000, expense: 1200 },
  { month: "Feb", income: 2200, expense: 1600 },
  { month: "Mar", income: 2100, expense: 1400 },
];

const categoryData = [
  { name: "Food", value: 400 },
  { name: "Transport", value: 300 },
  { name: "Rent", value: 800 },
  { name: "Shopping", value: 200 },
];

export function TrendChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={trendData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} />
        <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryPie() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={categoryData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {categoryData.map((_entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
