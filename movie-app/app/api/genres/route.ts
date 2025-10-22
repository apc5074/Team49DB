import { NextResponse } from "next/server";
import { query } from "@/lib/db";
export const runtime = "nodejs";

export async function GET() {
  const { rows } = await query(
    `SELECT genre_uid, name FROM genre ORDER BY name`
  );
  return NextResponse.json(rows);
}
