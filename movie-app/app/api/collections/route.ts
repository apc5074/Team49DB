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
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
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
    return NextResponse.json(
      { collectionId: rows[0].collection_id, name, userId: user.userId },
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
    console.error("POST /api/collections error:", err);
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
    const { rows } = await query(
      `
      SELECT collection_id, name, user_id
      FROM p320_49.collection
      WHERE user_id = $1
      ORDER BY name DESC
      `,
      [user.userId]
    );

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error("GET /api/collections error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
