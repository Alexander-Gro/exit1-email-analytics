import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.ANALYTICS_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  return NextResponse.json({ ok: true });
}
