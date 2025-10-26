// app/api/collections/[id]/movies/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

// ---------- GET: list movies in a collection ----------
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const collectionId = Number(id);
  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return NextResponse.json(
      { error: "Invalid collection ID" },
      { status: 400 }
    );
  }

  // Ownership check
  const owns = await query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM p320_49.collection c
      WHERE c.collection_id = $1 AND c.user_id = $2
    ) AS exists
    `,
    [collectionId, user.userId]
  );
  if (!owns.rows[0]?.exists) {
    return NextResponse.json(
      { error: "Collection not found for this user" },
      { status: 404 }
    );
  }

  // Fetch movies; compute year from release_date
  const { rows } = await query(
    `
    SELECT
      cm.mov_uid                       AS id,
      m.title                          AS title,
      m.duration                       AS duration_minutes,       -- integer minutes (assumed)
      m.release_date                   AS release_date,
      COALESCE(NULLIF(string_agg(DISTINCT g.name, ', '), ''), '—') AS genre
    FROM p320_49.collection_movies cm
    JOIN p320_49.movie m
      ON m.mov_uid = cm.mov_uid
    LEFT JOIN p320_49.movie_genre mg
      ON mg.mov_uid = m.mov_uid
    LEFT JOIN p320_49.genre g
      ON g.genre_uid = mg.genre_uid
    WHERE cm.collection_id = $1
    GROUP BY cm.mov_uid, m.title, m.duration, m.release_date
    ORDER BY m.title ASC
    `,
    [collectionId]
  );

  const data = rows.map((r: any) => {
    const year = r.release_date
      ? new Date(r.release_date).getUTCFullYear()
      : "—";
    return {
      id: Number(r.id),
      title: r.title ?? "(Untitled)",
      genre: r.genre ?? "—",
      duration: Number.isInteger(r.duration_minutes)
        ? `${r.duration_minutes}m`
        : "—",
      year,
    };
  });

  return NextResponse.json(data, { status: 200 });
}

// ---------- POST: add movie to a collection ----------
const AddMovieSchema = z.object({
  movUid: z.number().int().positive(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const collectionId = Number(id);
  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return NextResponse.json(
      { error: "Invalid collection ID" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = AddMovieSchema.safeParse(body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join(".") || "form",
      message: i.message,
    }));
    return NextResponse.json(
      { error: "Invalid input", errors },
      { status: 400 }
    );
  }
  const { movUid } = parsed.data;

  try {
    // Ownership
    const owns = await query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM p320_49.collection c
        WHERE c.collection_id = $1 AND c.user_id = $2
      ) AS exists
      `,
      [collectionId, user.userId]
    );
    if (!owns.rows[0]?.exists) {
      return NextResponse.json(
        { error: "Collection not found for this user" },
        { status: 404 }
      );
    }

    // Movie exists
    const movieExists = await query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM p320_49.movie m
        WHERE m.mov_uid = $1
      ) AS exists
      `,
      [movUid]
    );
    if (!movieExists.rows[0]?.exists) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    await query(
      `
      INSERT INTO p320_49.collection_movies (collection_id, mov_uid)
      VALUES ($1, $2)
      ON CONFLICT (collection_id, mov_uid) DO NOTHING
      `,
      [collectionId, movUid]
    );

    return NextResponse.json(
      { ok: true, collectionId, movUid },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === "23503") {
      return NextResponse.json(
        { error: "Foreign key violation (collection or movie missing)" },
        { status: 409 }
      );
    }
    console.error("POST /api/collections/[id]/movies error:", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      constraint: err?.constraint,
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ---------- DELETE: remove movie from a collection ----------
const DeleteMovieSchema = z.object({
  movUid: z.number().int().positive(),
});

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const collectionId = Number(id);
  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return NextResponse.json(
      { error: "Invalid collection ID" },
      { status: 400 }
    );
  }

  // movUid can come from query (?movUid=123) OR JSON body { movUid: 123 }
  const url = new URL(req.url);
  const movUidFromQuery = url.searchParams.get("movUid");
  let movUid: number | null = movUidFromQuery ? Number(movUidFromQuery) : null;

  if (!movUid) {
    const body = await req.json().catch(() => null);
    const parsed = DeleteMovieSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => ({
        field: i.path.join(".") || "form",
        message: i.message,
      }));
      return NextResponse.json(
        { error: "Invalid input", errors },
        { status: 400 }
      );
    }
    movUid = parsed.data.movUid;
  }

  if (!Number.isInteger(movUid) || movUid <= 0) {
    return NextResponse.json({ error: "Invalid movUid" }, { status: 400 });
  }

  try {
    // Ownership
    const owns = await query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM p320_49.collection c
        WHERE c.collection_id = $1 AND c.user_id = $2
      ) AS exists
      `,
      [collectionId, user.userId]
    );
    if (!owns.rows[0]?.exists) {
      return NextResponse.json(
        { error: "Collection not found for this user" },
        { status: 404 }
      );
    }

    // Delete the movie from the collection
    const result = await query(
      `
      DELETE FROM p320_49.collection_movies
      WHERE collection_id = $1 AND mov_uid = $2
      `,
      [collectionId, movUid]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Movie not in this collection" },
        { status: 404 }
      );
    }

    // 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/collections/[id]/movies error:", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      constraint: err?.constraint,
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
