import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { rows } = await query("SELECT NOW() as time");
    return NextResponse.json({ ok: true, time: rows[0].time });
  } catch (err: any) {
    console.error("DB health check failed:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
