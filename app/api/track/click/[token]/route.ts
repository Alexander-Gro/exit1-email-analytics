import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;
  const destination = req.nextUrl.searchParams.get("url");

  if (!destination) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  try {
    await sql`
      INSERT INTO events (campaign_id, type, url, ip, user_agent)
      VALUES (
        ${token}::uuid,
        'click',
        ${destination},
        ${req.headers.get("x-forwarded-for") ?? req.ip ?? null},
        ${req.headers.get("user-agent")}
      )
    `;
  } catch {
    // Silently fail — always redirect
  }

  // Preserve UTM params already on the destination URL (mirror, don't replace)
  return NextResponse.redirect(destination, { status: 302 });
}
