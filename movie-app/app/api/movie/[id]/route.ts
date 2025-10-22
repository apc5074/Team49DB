import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  try {
    const { rows: movieRows } = await query(
      `
      SELECT 
        m.mov_uid,
        m.title,
        m.duration,
        m.rating_uid,
        m.age_rating
      FROM movie m
      WHERE m.mov_uid = $1
      `,
      [id]
    );

    const movie = movieRows[0];
    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    const { rows: genres } = await query(
      `
      SELECT g.name
      FROM genres g
      JOIN movie_genres mg ON mg.genre_id = g.genre_uid
      WHERE mg.movie_id = $1
      ORDER BY g.name
      `,
      [id]
    );

    const { rows: cast } = await query(
      `
      SELECT p.name, c.character
      FROM credits c
      JOIN people p ON p.id = c.person_id
      WHERE c.movie_id = $1
        AND c.department = 'Acting'
      ORDER BY c.order_index ASC
      LIMIT 10
      `,
      [id]
    );

    return NextResponse.json({
      ...movie,
      genres: genres.map((g) => g.name),
      cast,
    });
  } catch (err: any) {
    console.error("Error fetching movie:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
