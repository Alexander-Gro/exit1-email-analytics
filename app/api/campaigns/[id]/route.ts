import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ANALYTICS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const campaignResult = await sql`
    SELECT id, name, subject, resend_template_id, created_at
    FROM campaigns WHERE id = ${id}::uuid
  `;

  if (!campaignResult.rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const statsResult = await sql`
    SELECT
      COUNT(CASE WHEN type = 'open' THEN 1 END)::int AS total_opens,
      COUNT(CASE WHEN type = 'click' THEN 1 END)::int AS total_clicks,
      COUNT(DISTINCT CASE WHEN type = 'open' THEN ip END)::int AS unique_opens,
      COUNT(DISTINCT CASE WHEN type = 'click' THEN ip END)::int AS unique_clicks
    FROM events WHERE campaign_id = ${id}::uuid
  `;

  const clicksResult = await sql`
    SELECT url, COUNT(*)::int AS count
    FROM events
    WHERE campaign_id = ${id}::uuid AND type = 'click'
    GROUP BY url ORDER BY count DESC
  `;

  return NextResponse.json({
    ...campaignResult.rows[0],
    stats: statsResult.rows[0],
    top_links: clicksResult.rows,
  });
}
