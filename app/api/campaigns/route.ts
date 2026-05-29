import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Inject tracking pixel and wrap links for a saved campaign
function instrumentHtml(html: string, campaignId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/track/open/${campaignId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;

  // Inject pixel before </body>
  let instrumented = html.includes("</body>")
    ? html.replace("</body>", `${pixel}</body>`)
    : html + pixel;

  // Wrap all <a href="..."> links except mailto/tel
  instrumented = instrumented.replace(
    /<a\s([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (match, before, href, after) => {
      const trackUrl = `${baseUrl}/api/track/click/${campaignId}?url=${encodeURIComponent(href)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    }
  );

  return instrumented;
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ANALYTICS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, subject, html, resend_template_id } = body;

  if (!name || !html) {
    return NextResponse.json({ error: "name and html are required" }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO campaigns (name, subject, html, resend_template_id)
    VALUES (${name}, ${subject ?? null}, ${html}, ${resend_template_id ?? null})
    RETURNING id, name, subject, resend_template_id, created_at
  `;

  const campaign = result.rows[0];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get("host")}`;
  const instrumentedHtml = instrumentHtml(html, campaign.id, baseUrl);

  return NextResponse.json({
    ...campaign,
    instrumented_html: instrumentedHtml,
  });
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ANALYTICS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sql`
    SELECT
      c.id, c.name, c.subject, c.resend_template_id, c.created_at,
      COUNT(DISTINCT CASE WHEN e.type = 'open' THEN e.id END)::int AS opens,
      COUNT(DISTINCT CASE WHEN e.type = 'click' THEN e.id END)::int AS clicks
    FROM campaigns c
    LEFT JOIN events e ON e.campaign_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  return NextResponse.json(result.rows);
}
