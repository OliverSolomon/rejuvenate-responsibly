"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/* -------------------------------------------------------------------------- */
/* shared pieces                                                              */
/* -------------------------------------------------------------------------- */

type TooltipRow = { name?: string; value?: number | string; color?: string };

/** One tooltip for every chart here, so hover reads the same way throughout. */
function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-forest-900/12 bg-bone-50 px-3 py-2 shadow-[0_12px_30px_-18px_rgba(8,23,15,0.5)]">
      <p className="text-[0.75rem] font-medium text-forest-900">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {payload.map((row, i) => (
          <li key={i} className="flex items-center gap-2 text-[0.75rem] text-forest-900/65">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            {row.name}
            <span className="ml-auto pl-3 font-medium text-forest-900 tabular-nums">
              {row.value}
              {suffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  table,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  table: React.ReactNode;
}) {
  return (
    <Card className="viz-root">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
        {/* The figures behind the picture, for screen readers, for anyone who
            cannot separate the colours, and for anyone who just wants the number. */}
        <details className="mt-4 border-t border-forest-900/8 pt-3">
          <summary className="cursor-pointer text-[0.75rem] text-forest-900/50">
            Show the numbers
          </summary>
          <div className="mt-3 overflow-x-auto">{table}</div>
        </details>
      </CardContent>
    </Card>
  );
}

function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-[0.8125rem]">
      <thead>
        <tr className="border-b border-forest-900/12">
          {head.map((h) => (
            <th key={h} className="py-2 pr-4 text-left font-medium text-forest-900">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-forest-900/6">
            {r.map((c, j) => (
              <td key={j} className="py-2 pr-4 text-forest-900/70 tabular-nums">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* -------------------------------------------------------------------------- */
/* pillar averages: magnitude across four named things -> horizontal bars      */
/* -------------------------------------------------------------------------- */

export function PillarChart({ data }: { data: { title: string; score: number }[] }) {
  return (
    <ChartCard
      title="Average score by pillar"
      description="Mean across every submitted assessment, out of 100."
      table={
        <MiniTable head={["Pillar", "Score"]} rows={data.map((d) => [d.title, d.score])} />
      }
    >
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 36, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="var(--grid)" />
            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="title"
              width={132}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: "rgba(13,36,24,0.04)" }} content={<ChartTooltip />} />
            {/* One series, so no legend: the title names it. Values are labelled
                directly, which also covers the lighter fills on a pale surface. */}
            <Bar
              dataKey="score"
              name="Score"
              fill="var(--series-1)"
              radius={[0, 4, 4, 0]}
              barSize={18}
              label={{ position: "right", fill: "var(--text-secondary)", fontSize: 11 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/* tiers: ordered buckets -> one hue, light to dark                            */
/* -------------------------------------------------------------------------- */

const ORDINAL = ["var(--ordinal-1)", "var(--ordinal-2)", "var(--ordinal-3)", "var(--ordinal-4)"];

export function TierChart({ data }: { data: { tier: string; count: number }[] }) {
  return (
    <ChartCard
      title="Organisations by tier"
      description="Bronze through Platinum. The ramp darkens as the tier rises."
      table={<MiniTable head={["Tier", "Organisations"]} rows={data.map((d) => [d.tier, d.count])} />}
    >
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -18, right: 8, top: 16, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="tier" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(13,36,24,0.04)" }} content={<ChartTooltip />} />
            <Bar
              dataKey="count"
              name="Organisations"
              radius={[4, 4, 0, 0]}
              barSize={44}
              label={{ position: "top", fill: "var(--text-secondary)", fontSize: 11 }}
            >
              {data.map((d, i) => (
                <Cell key={d.tier} fill={ORDINAL[i] ?? ORDINAL[ORDINAL.length - 1]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/* activity: change over time, two series -> lines with a legend               */
/* -------------------------------------------------------------------------- */

export function ActivityChart({
  data,
}: {
  data: { month: string; started: number; submitted: number }[];
}) {
  return (
    <ChartCard
      title="Assessments over time"
      description="Started against submitted, by month."
      table={
        <MiniTable
          head={["Month", "Started", "Submitted"]}
          rows={data.map((d) => [d.month, d.started, d.submitted])}
        />
      }
    >
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }}
            />
            <Line
              type="monotone"
              dataKey="started"
              name="Started"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-1)" }}
            />
            <Line
              type="monotone"
              dataKey="submitted"
              name="Submitted"
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-1)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/* common gaps: counts across many labels -> horizontal bars                    */
/* -------------------------------------------------------------------------- */

export function GapChart({ data }: { data: { topic: string; count: number }[] }) {
  return (
    <ChartCard
      title="Most common gaps"
      description="Topics answered no most often across all submitted assessments."
      table={<MiniTable head={["Topic", "Organisations"]} rows={data.map((d) => [d.topic, d.count])} />}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="var(--grid)" />
            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="topic" width={168} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(13,36,24,0.04)" }} content={<ChartTooltip />} />
            <Bar
              dataKey="count"
              name="Organisations"
              fill="var(--series-1)"
              radius={[0, 4, 4, 0]}
              barSize={14}
              label={{ position: "right", fill: "var(--text-secondary)", fontSize: 11 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------- */
/* perception gap: two series per pillar, on one assessment                    */
/* -------------------------------------------------------------------------- */

export function PerceptionChart({
  data,
}: {
  data: { title: string; self: number; others: number }[];
}) {
  return (
    <ChartCard
      title="Your view against theirs"
      description="Self-assessment beside the stakeholder average, per pillar."
      table={
        <MiniTable
          head={["Pillar", "Self", "Stakeholders"]}
          rows={data.map((d) => [d.title, d.self, d.others])}
        />
      }
    >
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -18, right: 8, top: 20, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="title" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(13,36,24,0.04)" }} content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }}
            />
            {/* 2px of surface between the pair, so the bars never fuse. */}
            <Bar
              dataKey="self"
              name="Self"
              fill="var(--series-1)"
              radius={[4, 4, 0, 0]}
              barSize={20}
              label={{ position: "top", fill: "var(--text-secondary)", fontSize: 10 }}
            />
            <Bar
              dataKey="others"
              name="Stakeholders"
              fill="var(--series-2)"
              radius={[4, 4, 0, 0]}
              barSize={20}
              label={{ position: "top", fill: "var(--text-secondary)", fontSize: 10 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
