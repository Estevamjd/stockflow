"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";

interface RevenueChartProps {
  data: { date: string; revenue: number; profit: number }[];
  onChartClick: (date: string) => void;
}

export default function RevenueChart({ data, onChartClick }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        onClick={(state: unknown) => {
          const s = state as { activeLabel?: string | number } | undefined;
          if (s?.activeLabel) {
            onChartClick(String(s.activeLabel));
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          interval={4}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          formatter={(v) => [formatCurrency(Number(v ?? 0)), ""] as [string, string]}
          labelFormatter={(l) => formatDate(l)}
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
        />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Receita" />
        <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} name="Lucro" strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
