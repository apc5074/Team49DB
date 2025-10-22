import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * PATCH /api/collections/:id
 * Body: { name: string, userId: number }
 * - Renames a collection (scoped by userId so users can’t rename others’ collections).
 */
const RenameSchema = z.object({
  name: z.string().min(1).max(200),
  userId: z.number().int().positive(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const collectionId = Number(params.id);
  if (!Number.isInteger(collectionId)) {
    return NextResponse.json(
      { error: "Invalid collection ID" },
      { status: 400 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = RenameSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { name, userId } = parsed.data;

  try {
    const { rowCount } = await query(
      `UPDATE p320_49.collection
         SET name = $1
       WHERE collection_id = $2
         AND user_id = $3`,
      [name, collectionId, userId]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { error: "Collection not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, collectionId, name });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "A collection with this name already exists for this user" },
        { status: 409 }
      );
    }
    console.error("PATCH /api/collections/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/:id?userId=123
 * - Deletes a collection (and cascades `collection_movies` if you set FK with ON DELETE CASCADE).
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const collectionId = Number(params.id);
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId"));

  if (
    !Number.isInteger(collectionId) ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return NextResponse.json(
      { error: "Invalid collectionId or userId" },
      { status: 400 }
    );
  }

  try {
    const { rowCount } = await query(
      `DELETE FROM p320_49.collections
        WHERE collection_id = $1
          AND user_id = $2`,
      [collectionId, userId]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { error: "Collection not found for this user" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/collections/[id] error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
