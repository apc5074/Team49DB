import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const SORT_MODES = ["rating", "plays", "combo"] as const;
type SortMode = (typeof SORT_MODES)[number];

type TopMovieRow = {
  mov_uid: number;
  title: string;
  duration: number | null;
  age_rating: string | null;
  rating_value: number | null;
  rated_at: string | null;
  watch_count: string | number; // COUNT(*)
  last_watched: string | null;
  score: string;
};

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const rawSort = url.searchParams.get("sort") ?? "combo";
  if (!SORT_MODES.includes(rawSort as SortMode)) {
    return NextResponse.json(
      { error: "Invalid sort mode. Use rating, plays, or combo." },
      { status: 400 }
    );
  }
  const sort = rawSort as SortMode;

  try {
    const { rows } = await query<TopMovieRow>(
      `
      WITH my_ratings AS (
        SELECT r.mov_uid, r.rating_value, r.rated_at
        FROM p320_49.rates r
        WHERE r.user_id = $1
      ),
      my_watches AS (
        SELECT
          w.mov_uid,
          COUNT(*) AS watch_count,
          MAX(w.date)::timestamptz AS last_watched
        FROM p320_49.watches w
        WHERE w.user_id = $1
        GROUP BY w.mov_uid
      )
      SELECT
        m.mov_uid,
        m.title,
        m.duration,
        m.age_rating,
        mr.rating_value,
        mr.rated_at,
        COALESCE(mw.watch_count, 0) AS watch_count,
        mw.last_watched,
        CASE
          WHEN $2 = 'rating' THEN COALESCE(mr.rating_value, 0)::numeric
          WHEN $2 = 'plays' THEN COALESCE(mw.watch_count, 0)::numeric
          ELSE COALESCE(mr.rating_value, 0)::numeric * 10
               + COALESCE(mw.watch_count, 0)::numeric
        END AS score
      FROM movie m
      LEFT JOIN my_ratings mr ON mr.mov_uid = m.mov_uid
      LEFT JOIN my_watches mw ON mw.mov_uid = m.mov_uid
      WHERE mr.mov_uid IS NOT NULL OR mw.mov_uid IS NOT NULL
      ORDER BY
        score DESC,
        COALESCE(mw.last_watched, mr.rated_at, '1970-01-01'::timestamptz) DESC,
        m.title
      LIMIT 10
      `,
      [me.userId, sort]
    );

    return NextResponse.json({
      sort,
      movies: rows.map((row) => ({
        mov_uid: row.mov_uid,
        title: row.title,
        duration: row.duration,
        age_rating: row.age_rating,
        rating_value: row.rating_value,
        rated_at: row.rated_at,
        watch_count: Number(row.watch_count),
        last_watched: row.last_watched,
        score: Number(row.score),
      })),
    });
  } catch (err) {
    console.error("GET /api/movie/top error:", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
