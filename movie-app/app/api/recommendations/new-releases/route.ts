// api/recommendations/new-releases/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

interface NewRelease {
  mov_uid: number;
  title: string;
  duration: number;
  age_rating: string;
  earliest_release: string;
  watch_count: number;
  avg_rating: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'watches';
    
    const orderByClause = sortBy === 'rating' 
      ? 'avg_rating DESC, watch_count DESC, earliest_release ASC'
      : 'watch_count DESC, avg_rating DESC, earliest_release ASC';

    const { rows } = await query<NewRelease>(
      `
      SELECT 
        m.mov_uid,
        m.title,
        m.duration,
        m.age_rating,
        MIN(pr.release_date)::date as earliest_release,
        COUNT(DISTINCT w.user_id)::int as watch_count,
        COALESCE(AVG(r.rating_value), 0)::float as avg_rating
      FROM movie m
      JOIN platform_release pr ON m.mov_uid = pr.mov_uid
      LEFT JOIN p320_49.watches w ON m.mov_uid = w.mov_uid
      LEFT JOIN p320_49.rates r ON m.mov_uid = r.mov_uid
      WHERE EXTRACT(YEAR FROM pr.release_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM pr.release_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      GROUP BY m.mov_uid, m.title, m.duration, m.age_rating
      ORDER BY ${orderByClause}
      LIMIT 5
      `,
      []
    );

    return NextResponse.json({ movies: rows });
  } catch (err: any) {
    console.error("GET /api/recommendations/new-releases error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}