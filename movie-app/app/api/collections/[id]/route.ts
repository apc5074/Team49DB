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
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  userId: z.number().int().positive("Invalid userId"),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // params is async in newer Next.js
) {
  const { id } = await ctx.params;
  const collectionId = Number(id);

  if (!Number.isInteger(collectionId) || collectionId <= 0) {
    return NextResponse.json(
      { ok: false, message: "Invalid collection ID" },
      { status: 400 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = RenameSchema.safeParse(json);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      field: i.path.join(".") || "form",
      message: i.message,
    }));
    return NextResponse.json(
      { ok: false, message: "Invalid input", errors },
      { status: 400 }
    );
  }

  const { name, userId } = parsed.data;

  try {
    const { rowCount } = await query(
      `UPDATE p320_49.collection
         SET name = $1
       WHERE collection_id = $2
         AND user_id = $3`,
      [name.trim(), collectionId, userId]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { ok: false, message: "Collection not found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, collectionId, name }, { status: 200 });
  } catch (err: any) {
    // Unique violation (e.g., unique (user_id, name))
    if (err?.code === "23505") {
      return NextResponse.json(
        {
          ok: false,
          message: "A collection with this name already exists for this user",
        },
        { status: 409 }
      );
    }
    console.error("PATCH /api/collections/[id] error:", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      constraint: err?.constraint,
    });
    return NextResponse.json(
      { ok: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/:id?userId=123
 * - Deletes a collection (and cascades `collection_movies` if FK is ON DELETE CASCADE).
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // params is async in newer Next.js
) {
  const { id } = await ctx.params;
  const collectionId = Number(id);

  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId"));

  if (
    !Number.isInteger(collectionId) ||
    collectionId <= 0 ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return NextResponse.json(
      { ok: false, message: "Invalid collectionId or userId" },
      { status: 400 }
    );
  }

  try {
    const { rowCount } = await query(
      `DELETE FROM p320_49.collection
        WHERE collection_id = $1
          AND user_id = $2`,
      [collectionId, userId]
    );

    if (rowCount === 0) {
      return NextResponse.json(
        { ok: false, message: "Collection not found for this user" },
        { status: 404 }
      );
    }

    // No body for 204
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/collections/[id] error:", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      constraint: err?.constraint,
    });
    return NextResponse.json(
      { ok: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
