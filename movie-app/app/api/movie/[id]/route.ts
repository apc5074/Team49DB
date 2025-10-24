// app/api/movie/[id]/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const movId = Number(id);
  if (!Number.isInteger(movId)) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  const me = await getSessionUser().catch(() => null);
  const userId = me?.userId ?? null;

  try {
    const { rows: movieRows } = await query(
      `
      SELECT 
        m.mov_uid,
        m.title,
        m.duration,
        m.age_rating,
        COALESCE(stats.avg_rating, 0)::float AS avg_rating,
        COALESCE(stats.rating_count, 0)      AS rating_count
      FROM movie m
      LEFT JOIN LATERAL (
        SELECT AVG(r.rating_value) AS avg_rating,
               COUNT(*)            AS rating_count
        FROM p320_49.rates r
        WHERE r.mov_uid = m.mov_uid
      ) AS stats ON TRUE
      WHERE m.mov_uid = $1
      `,
      [movId]
    );

    const movie = movieRows[0];
    if (!movie)
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });

    const { rows: genreRows } = await query<{ name: string }>(
      `
      SELECT g.name
      FROM movie_genre mg
      JOIN genre g ON g.genre_uid = mg.genre_uid
      WHERE mg.mov_uid = $1
      ORDER BY g.name
      `,
      [movId]
    );

    const { rows: castRows } = await query<{ name: string }>(
      `
      SELECT fc.name
      FROM casts_in ci
      JOIN film_contributor fc ON fc.fc_uid = ci.fc_uid
      WHERE ci.mov_uid = $1
      ORDER BY fc.name
      LIMIT 10
      `,
      [movId]
    );

    const { rows: directorRows } = await query<{ name: string }>(
      `
      SELECT fc.name
      FROM directs_in di
      JOIN film_contributor fc ON fc.fc_uid = di.fc_uid
      WHERE di.mov_uid = $1
      ORDER BY fc.name
      `,
      [movId]
    );

    let watched_at: string | null = null;
    let rating_value: number | null = null;
    let rated_at: string | null = null;

    if (userId != null) {
      const { rows: userRows } = await query<{
        watched_at: string | null;
        rating_value: number | null;
        rated_at: string | null;
      }>(
        `
        SELECT
          (SELECT MAX(w.date)::timestamptz
             FROM p320_49.watches w
             WHERE w.user_id = $1 AND w.mov_uid = $2) AS watched_at,
          (SELECT r.rating_value
             FROM p320_49.rates r
             WHERE r.user_id = $1 AND r.mov_uid = $2
             ORDER BY r.rated_at DESC
             LIMIT 1) AS rating_value,
          (SELECT r.rated_at
             FROM p320_49.rates r
             WHERE r.user_id = $1 AND r.mov_uid = $2
             ORDER BY r.rated_at DESC
             LIMIT 1) AS rated_at
        `,
        [userId, movId]
      );
      watched_at = userRows[0]?.watched_at ?? null;
      rating_value = userRows[0]?.rating_value ?? null;
      rated_at = userRows[0]?.rated_at ?? null;
    }

    return NextResponse.json({
      ...movie,
      genres: genreRows.map((g) => g.name),
      cast: castRows.map((c) => ({ name: c.name, character: null })),
      directors: directorRows.map((d) => d.name),
      user: {
        watched: watched_at !== null,
        watched_at,
        rating_value,
        rated_at,
      },
    });
  } catch (err: any) {
    console.error("GET /api/movie/[id] error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
