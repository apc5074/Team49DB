import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

type Row = {
  mov_uid: number;
  title: string;
  duration: number | null;
  age_rating: string | null;
  avg_rating: number | null;
  rating_count: number;
  genres: string[];
  directors: string[];
  cast: string[];
  studios: string[];
  earliest_release_date: string | null;
  user_rating: number | null;
};

const ALLOWED_SORT = new Set([
  "title",
  "avg_rating",
  "duration",
  "genre",
  "studio",
  "release_date",
]);

const DEFAULT_PAGE_SIZE = 20;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const genre = url.searchParams.get("genre")?.trim() ?? "";
  const cast = url.searchParams.get("cast")?.trim() ?? "";
  const director = url.searchParams.get("director")?.trim() ?? "";
  const studio = url.searchParams.get("studio")?.trim() ?? "";
  const releaseDate = url.searchParams.get("release_date")?.trim() ?? "";
  const sort = (url.searchParams.get("sort") ?? "title").toLowerCase();
  const order =
    (url.searchParams.get("order") ?? "asc").toLowerCase() === "desc"
      ? "DESC"
      : "ASC";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE))
  );

  const sortCol = ALLOWED_SORT.has(sort) ? sort : "title";
  const offset = (page - 1) * pageSize;

  const me = await getSessionUser().catch(() => null);
  const userId = me?.userId ?? null;

  try {
    const where: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (q) {
      where.push(`(
        m.title ILIKE $${p}
        OR EXISTS (
          SELECT 1
          FROM casts_in ci
          JOIN film_contributor fc ON fc.fc_uid = ci.fc_uid
          WHERE ci.mov_uid = m.mov_uid AND fc.name ILIKE $${p}
        )
        OR EXISTS (
          SELECT 1
          FROM directs_in di
          JOIN film_contributor fcd ON fcd.fc_uid = di.fc_uid
          WHERE di.mov_uid = m.mov_uid AND fcd.name ILIKE $${p}
        )
        OR EXISTS (
          SELECT 1
          FROM movie_genre mg
          JOIN genre g ON g.genre_uid = mg.genre_uid
          WHERE mg.mov_uid = m.mov_uid AND g.name ILIKE $${p}
        )
        OR EXISTS (
          SELECT 1
          FROM produces pr
          JOIN film_contributor fcs ON fcs.fc_uid = pr.fc_uid
          WHERE pr.mov_uid = m.mov_uid AND fcs.name ILIKE $${p}
        )
      )`);
      params.push(`%${q}%`);
      p++;
    }

    if (genre) {
      where.push(`EXISTS (
        SELECT 1
        FROM movie_genre mg
        JOIN genre g ON g.genre_uid = mg.genre_uid
        WHERE mg.mov_uid = m.mov_uid AND g.name ILIKE $${p}
      )`);
      params.push(`%${genre}%`);
      p++;
    }

    if (cast) {
      where.push(`EXISTS (
        SELECT 1
        FROM casts_in ci
        JOIN film_contributor fc ON fc.fc_uid = ci.fc_uid
        WHERE ci.mov_uid = m.mov_uid AND fc.name ILIKE $${p}
      )`);
      params.push(`%${cast}%`);
      p++;
    }

    if (director) {
      where.push(`EXISTS (
        SELECT 1
        FROM directs_in di
        JOIN film_contributor fc ON fc.fc_uid = di.fc_uid
        WHERE di.mov_uid = m.mov_uid AND fc.name ILIKE $${p}
      )`);
      params.push(`%${director}%`);
      p++;
    }
    if (studio) {
      where.push(`EXISTS (
        SELECT 1
        FROM produces pr
        JOIN film_contributor fcs ON fcs.fc_uid = pr.fc_uid
        WHERE pr.mov_uid = m.mov_uid AND fcs.name ILIKE $${p}
      )`);
      params.push(`%${studio}%`);
      p++;
    }

    if (releaseDate) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM platform_release pr
          WHERE pr.mov_uid = m.mov_uid
          AND pr.release_date::date = $${p}::date
          AND (SELECT MIN(pr2.release_date::date)
               FROM platform_release pr2
               WHERE pr2.mov_uid = m.mov_uid) = pr.release_date::date
        )
      `);
      params.push(releaseDate);
      p++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM movie m ${whereSql}`,
      params
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    const dataRes = await query<Row>(
      `
WITH base AS (
  SELECT
    m.mov_uid,
    m.title,
    m.duration,
    m.age_rating,
    (
      SELECT COALESCE(AVG(r.rating_value), 0)::float
      FROM p320_49.rates r
      WHERE r.mov_uid = m.mov_uid
    ) AS avg_rating,
    (
      SELECT COUNT(*)::int
      FROM p320_49.rates r
      WHERE r.mov_uid = m.mov_uid
    ) AS rating_count,
    (
      SELECT MIN(pr.release_date)
      FROM platform_release pr
      WHERE pr.mov_uid = m.mov_uid
    ) AS earliest_release_date
  FROM movie m
  ${whereSql}
),
genres AS (
  SELECT mg.mov_uid, ARRAY_AGG(DISTINCT g.name ORDER BY g.name) AS genres
  FROM movie_genre mg
  JOIN genre g ON g.genre_uid = mg.genre_uid
  WHERE EXISTS (SELECT 1 FROM base b WHERE b.mov_uid = mg.mov_uid)
  GROUP BY mg.mov_uid
),
directors AS (
  SELECT di.mov_uid, ARRAY_AGG(DISTINCT fc.name ORDER BY fc.name) AS directors
  FROM directs_in di
  JOIN film_contributor fc ON fc.fc_uid = di.fc_uid
  WHERE EXISTS (SELECT 1 FROM base b WHERE b.mov_uid = di.mov_uid)
  GROUP BY di.mov_uid
),
cast_members AS (
  SELECT ci.mov_uid, ARRAY_AGG(DISTINCT fc.name ORDER BY fc.name) AS cast_names
  FROM casts_in ci
  JOIN film_contributor fc ON fc.fc_uid = ci.fc_uid
  WHERE EXISTS (SELECT 1 FROM base b WHERE b.mov_uid = ci.mov_uid)
  GROUP BY ci.mov_uid
),
studios AS (
  SELECT pr.mov_uid, ARRAY_AGG(DISTINCT fc.name ORDER BY fc.name) AS studios
  FROM produces pr
  JOIN film_contributor fc ON fc.fc_uid = pr.fc_uid
  WHERE EXISTS (SELECT 1 FROM base b WHERE b.mov_uid = pr.mov_uid)
  GROUP BY pr.mov_uid
)
SELECT
  b.mov_uid,
  b.title,
  b.duration,
  b.age_rating,
  b.avg_rating,
  b.rating_count,
  b.earliest_release_date,
  COALESCE(g.genres, ARRAY[]::text[]) AS genres,
  COALESCE(d.directors, ARRAY[]::text[]) AS directors,
  COALESCE(cm.cast_names, ARRAY[]::text[]) AS cast,
  COALESCE(s.studios, ARRAY[]::text[]) AS studios,
  ur.user_rating
FROM base b
LEFT JOIN genres g        ON g.mov_uid = b.mov_uid
LEFT JOIN directors d     ON d.mov_uid = b.mov_uid
LEFT JOIN cast_members cm ON cm.mov_uid = b.mov_uid
LEFT JOIN studios s       ON s.mov_uid = b.mov_uid
LEFT JOIN LATERAL (
  SELECT r.rating_value AS user_rating
  FROM p320_49.rates r
  WHERE r.mov_uid = b.mov_uid AND r.user_id = $${p}
  ORDER BY r.rated_at DESC
  LIMIT 1
) ur ON TRUE
ORDER BY
  ${
    sortCol === "title"
      ? `b.title ${order}, b.earliest_release_date ASC`
      : sortCol === "avg_rating"
      ? `b.avg_rating ${order}, b.title ASC`
      : sortCol === "duration"
      ? `b.duration ${order} NULLS LAST, b.title ASC`
      : sortCol === "genre"
      ? `(CASE WHEN g.genres IS NULL OR array_length(g.genres,1)=0 THEN NULL ELSE g.genres[1] END) ${order} NULLS LAST, b.title ASC`
      : sortCol === "studio"
      ? `(CASE WHEN s.studios IS NULL OR array_length(s.studios,1)=0 THEN NULL ELSE s.studios[1] END) ${order} NULLS LAST, b.title ASC`
      : sortCol === "release_date"
      ? `b.earliest_release_date ${order} NULLS LAST, b.title ASC`
      : "b.title ASC"
  }
LIMIT $${p + 1} OFFSET $${p + 2}
      `,
      [...params, userId, pageSize, offset]
    );

    return NextResponse.json({
      total,
      page,
      pageSize,
      items: dataRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/explore error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
