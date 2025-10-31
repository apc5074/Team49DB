import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await query(
    `
    SELECT u.user_id, u.first_name, u.last_name, u.username, u.email
    FROM p320_49.follows f
    JOIN p320_49."user" u ON u.user_id = f.user_id
    WHERE f.follower_id = $1
    ORDER BY u.username NULLS LAST, u.last_name, u.first_name
    `,
    [me.userId]
  );

  return NextResponse.json(rows, { status: 200 });
}
