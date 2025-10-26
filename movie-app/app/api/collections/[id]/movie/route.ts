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

  // Fetch movies
const res = await query(
  `
  SELECT
    cm.mov_uid                       AS id,
    m.title                          AS title,
    m.duration                       AS duration_minutes,
    MIN(pr.release_date)              AS earliest_release_date,
    COALESCE(NULLIF(string_agg(DISTINCT g.name, ', '), ''), '—') AS genre
  FROM p320_49.collection_movies cm
  JOIN p320_49.movie m
    ON m.mov_uid = cm.mov_uid
  LEFT JOIN p320_49.platform_release pr
    ON pr.mov_uid = m.mov_uid
  LEFT JOIN p320_49.movie_genre mg
    ON mg.mov_uid = m.mov_uid
  LEFT JOIN p320_49.genre g
    ON g.genre_uid = mg.genre_uid
  WHERE cm.collection_id = $1
  GROUP BY cm.mov_uid, m.title, m.duration
  ORDER BY m.title ASC
  `,
  [collectionId]
);
  const rows = (res?.rows ?? []) as any[];

const data = rows.map((r) => {
  const year = r.earliest_release_date
    ? new Date(r.earliest_release_date).getUTCFullYear()
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

// ---------- POST: add movie by movUid or title ----------
const AddById = z.object({
  movUid: z.number().int().positive(),
});
const AddByTitle = z.object({
  title: z.string().min(1).max(300),
  year: z.number().int().min(1800).max(2100).optional(),
});
const AddMovieSchema = z.union([AddById, AddByTitle]);

type Choice = { movUid: number; title: string; year: number | null };

async function lookupMovUidByTitle(
  titleRaw: string,
  year?: number
): Promise<
  | { ok: true; movUid: number }
  | { ok: false; code: 404; message: string }
  | { ok: false; code: 409; message: string; choices: Choice[] }
> {
  const title = titleRaw.trim();
  if (!title) return { ok: false, code: 404, message: "Empty title" };

  if (year) {
    const res = await query<{
      mov_uid: number;
      title: string;
      release_year: number | null;
    }>(
      `
      SELECT m.mov_uid, m.title, EXTRACT(YEAR FROM m.release_date)::int AS release_year
      FROM p320_49.movie m
      WHERE lower(m.title) = lower($1)
        AND EXTRACT(YEAR FROM m.release_date) = $2
      LIMIT 10
      `,
      [title, year]
    );
    const rows = res?.rows ?? [];
    if (rows.length === 0) {
      return {
        ok: false,
        code: 404,
        message: `Movie titled "${title}" (${year}) not found`,
      };
    }
    if (rows.length > 1) {
      const choices: Choice[] = rows.map((r) => ({
        movUid: r.mov_uid,
        title: r.title,
        year: r.release_year ?? null,
      }));
      return {
        ok: false,
        code: 409,
        message: "Multiple movies match title and year",
        choices,
      };
    }
    return { ok: true, movUid: rows[0].mov_uid };
  }

  // No year: try exact, then fuzzy
  const exactRes = await query<{
    mov_uid: number;
    title: string;
    release_year: number | null;
  }>(
    `
    SELECT m.mov_uid, m.title, EXTRACT(YEAR FROM m.release_date)::int AS release_year
    FROM p320_49.movie m
    WHERE lower(m.title) = lower($1)
    ORDER BY m.release_date DESC NULLS LAST
    LIMIT 10
    `,
    [title]
  );
  const exactRows = exactRes?.rows ?? [];

  let rowsToUse = exactRows;
  if (rowsToUse.length === 0) {
    const fuzzyRes = await query<{
      mov_uid: number;
      title: string;
      release_year: number | null;
    }>(
      `
      SELECT m.mov_uid, m.title, EXTRACT(YEAR FROM m.release_date)::int AS release_year
      FROM p320_49.movie m
      WHERE m.title ILIKE '%' || $1 || '%'
      ORDER BY m.release_date DESC NULLS LAST
      LIMIT 10
      `,
      [title]
    );
    rowsToUse = fuzzyRes?.rows ?? [];
  }

  if (rowsToUse.length === 0) {
    return {
      ok: false,
      code: 404,
      message: `No movies found matching "${title}"`,
    };
  }
  if (rowsToUse.length > 1) {
    const choices: Choice[] = rowsToUse.map((r) => ({
      movUid: r.mov_uid,
      title: r.title,
      year: r.release_year ?? null,
    }));
    return {
      ok: false,
      code: 409,
      message: "Multiple movies match title",
      choices,
    };
  }
  return { ok: true, movUid: rowsToUse[0].mov_uid };
}

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

  try {
    // Verify collection ownership
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

    // Resolve movUid safely
    let movUid: number;
    if ("movUid" in parsed.data) {
      movUid = parsed.data.movUid;
      const check = await query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM p320_49.movie WHERE mov_uid = $1) AS exists`,
        [movUid]
      );
      if (!check.rows[0]?.exists) {
        return NextResponse.json({ error: "Movie not found" }, { status: 404 });
      }
    } else {
      const result = await lookupMovUidByTitle(
        parsed.data.title,
        parsed.data.year
      );
      if (!result.ok) {
        if (result.code === 404) {
          return NextResponse.json({ error: result.message }, { status: 404 });
        }
        // 409 with choices for disambiguation
        return NextResponse.json(
          { error: result.message, choices: result.choices ?? [] },
          { status: 409 }
        );
      }
      movUid = result.movUid;
    }

    // Insert membership
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
    console.error("POST /api/collections/[id]/movies error:", err);
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

    const result = await query(
      `
      DELETE FROM p320_49.collection_movies
      WHERE collection_id = $1 AND mov_uid = $2
      `,
      [collectionId, movUid]
    );

    if ((result?.rowCount ?? 0) === 0) {
      return NextResponse.json(
        { error: "Movie not in this collection" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/collections/[id]/movies error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
