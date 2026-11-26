"use client";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];
const tooltipStyle = { borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-popover)", color: "var(--color-popover-foreground)" };
const short = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function TrendChart({ data, color = "var(--color-chart-1)", label }: { data: { date: string; count: number }[]; color?: string; label: string }) {
  const id = `g-${label.replace(/\W/g, "")}`;
  return (
    <div className="h-56" role="img" aria-label={`${label} over the last ${data.length} days`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={short} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => short(String(l))} formatter={(v) => [v, label]} />
          <Area type="monotone" dataKey="count" stroke={color} strokeWidth={2.5} fill={`url(#${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  return (
    <div style={{ height: Math.max(160, data.length * 32) }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="var(--color-chart-2)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  return (
    <div className="h-48" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
