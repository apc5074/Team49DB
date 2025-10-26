// app/api/collections/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const CreateCollectionBody = z.object({
  name: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateCollectionBody.safeParse(body);
  if (!parsed.success) {
    // optional: flatten zod errors to avoid "[object Object]"
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join(".") || "form",
      message: i.message,
    }));
    return NextResponse.json(
      { error: "Invalid input", errors },
      { status: 400 }
    );
  }

  const { name } = parsed.data;

  try {
    const { rows } = await query<{ collection_id: number }>(
      `
      INSERT INTO p320_49.collection (name, user_id)
      VALUES ($1, $2)
      RETURNING collection_id
      `,
      [name, user.userId]
    );

    // Include movieCount so client doesn’t need a second call
    return NextResponse.json(
      {
        collectionId: rows[0].collection_id,
        name,
        userId: user.userId,
        movieCount: 0,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/collections error:", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      constraint: err?.constraint,
    });
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "Collection name already exists for this user" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Count movies per collection
    const { rows } = await query<{
      collection_id: number;
      name: string;
      user_id: number;
      movie_count: number;
    }>( // movie_count comes as number/int
      `
      SELECT
        c.collection_id,
        c.name,
        c.user_id,
        COALESCE(COUNT(cm.mov_uid), 0)::int AS movie_count
      FROM p320_49.collection c
      LEFT JOIN p320_49.collection_movies cm
        ON cm.collection_id = c.collection_id
      WHERE c.user_id = $1
      GROUP BY c.collection_id, c.name, c.user_id
      ORDER BY c.name DESC
      `,
      [user.userId]
    );

    // CamelCase the field for the frontend
    const data = rows.map((r) => ({
      collectionId: r.collection_id,
      name: r.name,
      userId: r.user_id,
      movieCount: r.movie_count,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("GET /api/collections error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
