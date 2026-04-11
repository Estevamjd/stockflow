"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  SHOPEE: "#ee4d2d",
  MANUAL: "#6366f1",
  ELO7: "#f59e0b",
  MAGALU: "#0ea5e9",
  MERCADO_LIVRE: "#fbbf24",
  AMAZON: "#f97316",
  OTHER: "#8b5cf6",
};

interface ChannelPieChartProps {
  data: { channel: string; count: number; revenue: number }[];
  onPieClick: (channel: string) => void;
}

export default function ChannelPieChart({ data, onPieClick }: ChannelPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie 
          data={data} 
          dataKey="count" 
          nameKey="channel" 
          cx="50%" 
          cy="50%" 
          outerRadius={80} 
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
          fontSize={10}
          onClick={(payload: unknown) => {
            const item = payload as { channel?: string } | undefined;
            if (item?.channel) {
              onPieClick(item.channel);
            }
          }}
          style={{ cursor: "pointer" }}
        >
          {data.map((entry) => (
            <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? "#6366f1"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [String(v ?? ""), "Pedidos"] as [string, string]}
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
