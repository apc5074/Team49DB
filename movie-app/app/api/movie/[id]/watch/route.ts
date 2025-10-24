import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const WatchBody = z.object({
  date: z.string().datetime().optional(), // optional ISO; defaults to NOW()
});

async function ensureMovieExists(movId: number) {
  const { rows } = await query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM movie WHERE mov_uid = $1) AS exists`,
    [movId]
  );
  return rows[0]?.exists === true;
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const movId = Number(id);
  if (!Number.isInteger(movId)) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }
  if (!(await ensureMovieExists(movId))) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = WatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const when = parsed.data.date ?? null;

  try {
    await query(
      `
      INSERT INTO p320_49.watches (user_id, mov_uid, date)
      VALUES ($1, $2, COALESCE($3::timestamptz, NOW()))
      `,
      [me.userId, movId, when]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/movie/[id]/watch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
