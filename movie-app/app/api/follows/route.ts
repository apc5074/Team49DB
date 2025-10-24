import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const FollowSchema = z.object({ email: z.string().email().max(254) });

// POST /api/follows  -> I (session user) follow target by email
export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = FollowSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const email = parsed.data.email;

  try {
    const target = await query<{ user_id: number }>(
      `SELECT user_id FROM p320_49."user" WHERE lower(email)=lower($1)`,
      [email]
    );
    if (target.rowCount === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const targetId = target.rows[0].user_id;
    if (targetId === me.userId)
      return NextResponse.json(
        { error: "You cannot follow yourself" },
        { status: 400 }
      );

    await query(
      `INSERT INTO p320_49.follows (user_id, follower_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, follower_id) DO NOTHING`,
      [targetId, me.userId]
    );

    return NextResponse.json(
      { ok: true, followingUserId: targetId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/follows error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/follows  -> I (session user) unfollow target by email
export async function DELETE(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = FollowSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  const email = parsed.data.email;

  try {
    const target = await query<{ user_id: number }>(
      `SELECT user_id FROM p320_49."user" WHERE lower(email)=lower($1)`,
      [email]
    );
    if (target.rowCount === 0)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const targetId = target.rows[0].user_id;
    await query(
      `DELETE FROM p320_49.follows WHERE user_id=$1 AND follower_id=$2`,
      [targetId, me.userId]
    );
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/follows error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
