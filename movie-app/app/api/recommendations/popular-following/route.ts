// api/recommendations/popular-following/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

interface PopularMovie {
  mov_uid: number;
  title: string;
  duration: number;
  age_rating: string;
  friend_count: number;
  total_watches: number;
  avg_rating: number;
}

export async function GET(request: Request) {
  try {
    const me = await getSessionUser().catch(() => null);
    
    if (!me?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'watches';
    
    const followingCheck = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count 
       FROM p320_49.follows 
       WHERE follower_id = $1`,
      [me.userId]
    );
    
    const hasFollowing = parseInt(followingCheck.rows[0]?.count || '0') > 0;
    
    const orderByClause = sortBy === 'rating' 
      ? 'avg_rating DESC, total_watches DESC'
      : 'total_watches DESC, avg_rating DESC';

    const { rows } = await query<PopularMovie>(
      `
      SELECT 
        m.mov_uid,
        m.title,
        m.duration,
        m.age_rating,
        COUNT(DISTINCT w.user_id)::int as friend_count,
        COUNT(*)::int as total_watches,
        COALESCE(AVG(r.rating_value), 0)::float as avg_rating
      FROM movie m
      JOIN p320_49.watches w ON m.mov_uid = w.mov_uid
      JOIN p320_49.follows f ON w.user_id = f.user_id
      LEFT JOIN p320_49.rates r ON m.mov_uid = r.mov_uid AND r.user_id = f.user_id
      WHERE f.follower_id = $1
      GROUP BY m.mov_uid, m.title, m.duration, m.age_rating
      ORDER BY ${orderByClause}
      LIMIT 20
      `,
      [me.userId]
    );

    return NextResponse.json({ 
      movies: rows,
      hasFollowing 
    });
  } catch (err: any) {
    console.error("GET /api/recommendations/popular-following error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}