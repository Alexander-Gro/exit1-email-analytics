import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    await sql`
      INSERT INTO events (campaign_id, type, ip, user_agent)
      VALUES (
        ${token}::uuid,
        'open',
        ${req.headers.get("x-forwarded-for") ?? null},
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
