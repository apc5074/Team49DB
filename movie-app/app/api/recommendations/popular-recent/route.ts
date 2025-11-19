// api/recommendations/popular-recent/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

interface PopularMovie {
  mov_uid: number;
  title: string;
  duration: number;
  age_rating: string;
  watch_count: number;
  avg_rating: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'watches';
    
    const orderByClause = sortBy === 'rating' 
      ? 'avg_rating DESC, watch_count DESC'
      : 'watch_count DESC, avg_rating DESC';

    const { rows } = await query<PopularMovie>(
      `
      SELECT 
        m.mov_uid,
        m.title,
        m.duration,
        m.age_rating,
        COUNT(w.user_id)::int as watch_count,
        COALESCE(AVG(r.rating_value), 0)::float as avg_rating
      FROM movie m
      JOIN p320_49.watches w ON m.mov_uid = w.mov_uid
      LEFT JOIN p320_49.rates r ON m.mov_uid = r.mov_uid
      WHERE w.date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY m.mov_uid, m.title, m.duration, m.age_rating
      ORDER BY ${orderByClause}
      LIMIT 20
      `,
      []
    );

    return NextResponse.json({ movies: rows });
  } catch (err: any) {
    console.error("GET /api/recommendations/popular-recent error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}