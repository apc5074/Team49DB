import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const RateBody = z.object({
  rating_value: z.number().int().min(1).max(5),
  rated_at: z.string().datetime().optional(),
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
  const parsed = RateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { rating_value, rated_at } = parsed.data;

  try {
    await query(
      `
      INSERT INTO p320_49.rates (user_id, mov_uid, rating_value, rated_at)
      VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()))
      ON CONFLICT (user_id, mov_uid)
      DO UPDATE SET
        rating_value = EXCLUDED.rating_value,
        rated_at     = EXCLUDED.rated_at
      `,
      [me.userId, movId, rating_value, rated_at ?? null]
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/movie/[id]/rate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const movId = Number(id);
  if (!Number.isInteger(movId)) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  try {
    await query(`DELETE FROM p320_49.rates WHERE user_id=$1 AND mov_uid=$2`, [
      me.userId,
      movId,
    ]);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/movie/[id]/rate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
