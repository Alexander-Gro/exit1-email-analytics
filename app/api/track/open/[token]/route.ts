import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    await sql`
      INSERT INTO events (campaign_id, type, ip, user_agent)
      VALUES (
        ${token}::uuid,
        'open',
        ${req.headers.get("x-forwarded-for") ?? req.ip ?? null},
        ${req.headers.get("user-agent")}
      )
    `;
  } catch {
    // Silently fail — don't break email clients
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}
