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

function instrumentHtml(html: string, campaignId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/track/open/${campaignId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  let instrumented = html.includes("</body>")
    ? html.replace("</body>", `${pixel}</body>`)
    : html + pixel;
  instrumented = instrumented.replace(
    /<a\s([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (_match, before, href, after) => {
      const trackUrl = `${baseUrl}/api/track/click/${campaignId}?url=${encodeURIComponent(href)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    }
  );
  return instrumented;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ANALYTICS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { html, name, subject, resend_template_id } = body;

  if (!html) {
    return NextResponse.json({ error: "html is required" }, { status: 400 });
  }

  const result = await sql`
    UPDATE campaigns
    SET
      html = ${html},
      name = COALESCE(${name ?? null}, name),
      subject = COALESCE(${subject ?? null}, subject),
      resend_template_id = COALESCE(${resend_template_id ?? null}, resend_template_id)
    WHERE id = ${id}::uuid
    RETURNING id, name, subject, resend_template_id, created_at
  `;

  if (!result.rows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const campaign = result.rows[0];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;
  const instrumentedHtml = instrumentHtml(html, campaign.id, baseUrl);

  return NextResponse.json({ ...campaign, instrumented_html: instrumentedHtml });
}
