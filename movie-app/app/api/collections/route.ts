import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const CreateCollection = z.object({
  name: z.string().min(1).max(200),
  userId: z.number().int().positive(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateCollection.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { name, userId } = parsed.data;

  try {
    const { rows } = await query<{ collection_id: number }>(
      `INSERT INTO p320_49.collection (name, user_id)
       VALUES ($1, $2)
       RETURNING collection_id`,
      [name, userId]
    );

    return NextResponse.json(
      { collectionId: rows[0].collection_id, name, userId },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "Collection name already exists for this user" },
        { status: 409 }
      );
    }
    console.error("POST /api/collections error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId"));
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const { rows } = await query(
    `SELECT collection_id, name, user_id, created_at
       FROM p320_49.collection
       WHERE user_id = $1
       ORDER BY created_at DESC`,
    [userId]
  );

  return NextResponse.json(rows);
}
