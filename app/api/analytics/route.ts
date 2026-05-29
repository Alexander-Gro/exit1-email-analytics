import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ANALYTICS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const compareFrom = searchParams.get("compareFrom");
  const compareTo = searchParams.get("compareTo");
  const campaignId = searchParams.get("campaignId");

  async function fetchPeriod(start: string, end: string) {
    if (campaignId) {
      const [summary, timeseries, topLinks] = await Promise.all([
        sql`
          SELECT
            COUNT(CASE WHEN type = 'open' THEN 1 END)::int AS total_opens,
            COUNT(CASE WHEN type = 'click' THEN 1 END)::int AS total_clicks,
            COUNT(DISTINCT CASE WHEN type = 'open' THEN ip END)::int AS unique_opens,
            COUNT(DISTINCT CASE WHEN type = 'click' THEN ip END)::int AS unique_clicks
          FROM events
          WHERE campaign_id = ${campaignId}::uuid
            AND created_at >= ${start}::timestamptz
            AND created_at <= ${end}::timestamptz
        `,
        sql`
          SELECT
            DATE_TRUNC('day', created_at)::date::text AS date,
            COUNT(CASE WHEN type = 'open' THEN 1 END)::int AS opens,
            COUNT(CASE WHEN type = 'click' THEN 1 END)::int AS clicks
          FROM events
          WHERE campaign_id = ${campaignId}::uuid
            AND created_at >= ${start}::timestamptz
            AND created_at <= ${end}::timestamptz
          GROUP BY 1 ORDER BY 1
        `,
        sql`
          SELECT url, COUNT(*)::int AS count
          FROM events
          WHERE type = 'click'
            AND campaign_id = ${campaignId}::uuid
            AND created_at >= ${start}::timestamptz
            AND created_at <= ${end}::timestamptz
          GROUP BY url ORDER BY count DESC LIMIT 10
        `,
      ]);
      return { summary: summary.rows[0], timeseries: timeseries.rows, topLinks: topLinks.rows };
    }

    const [summary, timeseries, topLinks] = await Promise.all([
      sql`
        SELECT
          COUNT(CASE WHEN type = 'open' THEN 1 END)::int AS total_opens,
          COUNT(CASE WHEN type = 'click' THEN 1 END)::int AS total_clicks,
          COUNT(DISTINCT CASE WHEN type = 'open' THEN ip END)::int AS unique_opens,
          COUNT(DISTINCT CASE WHEN type = 'click' THEN ip END)::int AS unique_clicks
        FROM events
        WHERE created_at >= ${start}::timestamptz
          AND created_at <= ${end}::timestamptz
      `,
      sql`
        SELECT
          DATE_TRUNC('day', created_at)::date::text AS date,
          COUNT(CASE WHEN type = 'open' THEN 1 END)::int AS opens,
          COUNT(CASE WHEN type = 'click' THEN 1 END)::int AS clicks
        FROM events
        WHERE created_at >= ${start}::timestamptz
          AND created_at <= ${end}::timestamptz
        GROUP BY 1 ORDER BY 1
      `,
      sql`
        SELECT url, COUNT(*)::int AS count
        FROM events
        WHERE type = 'click'
          AND created_at >= ${start}::timestamptz
          AND created_at <= ${end}::timestamptz
        GROUP BY url ORDER BY count DESC LIMIT 10
      `,
    ]);
    return { summary: summary.rows[0], timeseries: timeseries.rows, topLinks: topLinks.rows };
  }

  const fromDate = from ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const toDate = to ?? new Date().toISOString().slice(0, 10);

  const current = await fetchPeriod(fromDate, toDate + "T23:59:59Z");

  let compare = null;
  if (compareFrom && compareTo) {
    compare = await fetchPeriod(compareFrom, compareTo + "T23:59:59Z");
  }

  // Fill day gaps so chart renders continuous lines
  const days: string[] = [];
  const d = new Date(fromDate);
  const endDate = new Date(toDate);
  while (d <= endDate) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }

  const tsMap = Object.fromEntries(current.timeseries.map((r: any) => [r.date, r]));
  const filledTimeseries = days.map((date) => tsMap[date] ?? { date, opens: 0, clicks: 0 });

  let filledCompareTimeseries = null;
  if (compare) {
    const cDays: string[] = [];
    const cd = new Date(compareFrom!);
    const ce = new Date(compareTo!);
    while (cd <= ce) {
      cDays.push(cd.toISOString().slice(0, 10));
      cd.setDate(cd.getDate() + 1);
    }
    const cMap = Object.fromEntries(compare.timeseries.map((r: any) => [r.date, r]));
    filledCompareTimeseries = cDays.map((date) => cMap[date] ?? { date, opens: 0, clicks: 0 });
  }

  return NextResponse.json({
    period: { from: fromDate, to: toDate },
    current: { ...current, timeseries: filledTimeseries },
    compare: compare ? { ...compare, timeseries: filledCompareTimeseries } : null,
  });
}
