"use client";

import * as React from "react";
import { subDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MousePointerClick,
  Eye,
  Users,
  BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DateRangePicker } from "./date-range-picker";

const API_KEY = process.env.NEXT_PUBLIC_ANALYTICS_API_KEY ?? "";

const chartConfig = {
  opens:       { label: "Opens",          color: "oklch(0.585 0.102 167)" },
  clicks:      { label: "Clicks",         color: "oklch(0.55 0.13 230)"  },
  prev_opens:  { label: "Opens (prev)",   color: "oklch(0.585 0.102 167 / 0.35)" },
  prev_clicks: { label: "Clicks (prev)",  color: "oklch(0.55 0.13 230 / 0.35)"  },
} satisfies ChartConfig;

function pct(a: number, b: number) {
  if (!b) return null;
  return Math.round(((a - b) / b) * 100);
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${
        flat ? "text-muted-foreground" : up ? "text-[--success]" : "text-destructive"
      }`}
      style={
        up ? { color: "oklch(0.65 0.17 152)" } : !flat ? { color: "oklch(0.65 0.22 22)" } : {}
      }
    >
      {flat ? <Minus className="h-3 w-3" strokeWidth={1.5} /> : up ? <TrendingUp className="h-3 w-3" strokeWidth={1.5} /> : <TrendingDown className="h-3 w-3" strokeWidth={1.5} />}
      {flat ? "—" : `${up ? "+" : ""}${value}%`}
    </span>
  );
}

function StatCard({
  label, value, compare, icon: Icon, loading,
}: {
  label: string; value: number; compare?: number; icon: React.ElementType; loading: boolean;
}) {
  const delta = compare !== undefined ? pct(value, compare) : null;
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 bg-muted" />
        ) : (
          <div className="flex items-end gap-2">
            <span className="text-3xl font-semibold tabular-nums">{value.toLocaleString()}</span>
            <Delta value={delta} />
          </div>
        )}
        {!loading && compare !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">vs {compare.toLocaleString()} prev period</p>
        )}
      </CardContent>
    </Card>
  );
}

type Period = {
  summary: { total_opens: number; total_clicks: number; unique_opens: number; unique_clicks: number };
  timeseries: { date: string; opens: number; clicks: number }[];
  topLinks: { url: string; count: number }[];
};

type AnalyticsData = {
  period: { from: string; to: string };
  current: Period;
  compare: Period | null;
};

export function AnalyticsDashboard() {
  const [range, setRange] = React.useState<DateRange>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [compareEnabled, setCompareEnabled] = React.useState(false);
  const [metric, setMetric] = React.useState<"both" | "opens" | "clicks">("both");
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    if (!range.from || !range.to) return;
    setLoading(true);

    const from = format(range.from, "yyyy-MM-dd");
    const to = format(range.to, "yyyy-MM-dd");

    const diff = range.to.getTime() - range.from.getTime();
    const compareFrom = format(new Date(range.from.getTime() - diff - 86400000), "yyyy-MM-dd");
    const compareTo = format(new Date(range.from.getTime() - 86400000), "yyyy-MM-dd");

    const params = new URLSearchParams({ from, to });
    if (compareEnabled) {
      params.set("compareFrom", compareFrom);
      params.set("compareTo", compareTo);
    }

    try {
      const res = await fetch(`/api/analytics?${params}`, {
        headers: { "x-api-key": API_KEY },
      });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range, compareEnabled]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const current = data?.current;
  const compare = data?.compare;

  const chartData = React.useMemo(() => {
    if (!current) return [];
    return current.timeseries.map((row, i) => ({
      date: row.date,
      opens: row.opens,
      clicks: row.clicks,
      prev_opens: compare?.timeseries[i]?.opens,
      prev_clicks: compare?.timeseries[i]?.clicks,
    }));
  }, [current, compare]);

  const topLinks = current?.topLinks ?? [];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker value={range} onChange={setRange} />
        <div className="flex items-center gap-2">
          <Switch
            id="compare"
            checked={compareEnabled}
            onCheckedChange={setCompareEnabled}
          />
          <Label htmlFor="compare" className="text-sm text-muted-foreground cursor-pointer">
            Compare to previous period
          </Label>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Opens"   value={current?.summary.total_opens   ?? 0} compare={compare?.summary.total_opens}   icon={Eye}              loading={loading} />
        <StatCard label="Unique Opens"  value={current?.summary.unique_opens  ?? 0} compare={compare?.summary.unique_opens}  icon={Users}            loading={loading} />
        <StatCard label="Total Clicks"  value={current?.summary.total_clicks  ?? 0} compare={compare?.summary.total_clicks}  icon={MousePointerClick} loading={loading} />
        <StatCard label="Unique Clicks" value={current?.summary.unique_clicks ?? 0} compare={compare?.summary.unique_clicks} icon={BarChart2}         loading={loading} />
      </div>

      {/* Area chart */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div>
            <CardTitle className="text-sm font-semibold">Opens &amp; Clicks Over Time</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {data?.period.from && data?.period.to
                ? `${format(new Date(data.period.from), "MMM d")} – ${format(new Date(data.period.to), "MMM d, yyyy")}`
                : ""}
            </CardDescription>
          </div>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
            <TabsList className="bg-muted h-7 text-xs">
              <TabsTrigger value="both"   className="text-xs h-5 px-2.5">Both</TabsTrigger>
              <TabsTrigger value="opens"  className="text-xs h-5 px-2.5">Opens</TabsTrigger>
              <TabsTrigger value="clicks" className="text-xs h-5 px-2.5">Clicks</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[220px] w-full bg-muted rounded-lg" />
          ) : (
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => format(new Date(v), "MMM d")}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => format(new Date(v as string), "MMM d, yyyy")}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />

                {/* Flat-mode: solid stroke, no decorative gradient fill */}
                {(metric === "both" || metric === "opens") && (
                  <Area
                    dataKey="opens"
                    type="monotone"
                    stroke="oklch(0.585 0.102 167)"
                    fill="oklch(0.585 0.102 167)"
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {(metric === "both" || metric === "clicks") && (
                  <Area
                    dataKey="clicks"
                    type="monotone"
                    stroke="oklch(0.55 0.13 230)"
                    fill="oklch(0.55 0.13 230)"
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                    dot={false}
                  />
                )}
                {compareEnabled && compare && (metric === "both" || metric === "opens") && (
                  <Area
                    dataKey="prev_opens"
                    type="monotone"
                    stroke="oklch(0.585 0.102 167)"
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    strokeOpacity={0.45}
                    dot={false}
                  />
                )}
                {compareEnabled && compare && (metric === "both" || metric === "clicks") && (
                  <Area
                    dataKey="prev_clicks"
                    type="monotone"
                    stroke="oklch(0.55 0.13 230)"
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    strokeOpacity={0.45}
                    dot={false}
                  />
                )}
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Top links */}
      {topLinks.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold">Top Clicked Links</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Most clicked URLs in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[180px] w-full bg-muted rounded-lg" />
            ) : (
              <ChartContainer
                config={{ count: { label: "Clicks", color: "oklch(0.585 0.102 167)" } }}
                className="h-[180px] w-full"
              >
                <BarChart data={topLinks} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.6} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="url"
                    width={200}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    tickFormatter={(v) => {
                      try {
                        const u = new URL(v);
                        const s = u.hostname + u.pathname;
                        return s.length > 34 ? s.slice(0, 34) + "…" : s;
                      } catch {
                        return v.slice(0, 34);
                      }
                    }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="oklch(0.585 0.102 167)" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
