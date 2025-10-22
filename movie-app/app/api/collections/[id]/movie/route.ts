import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const AddMovie = z.object({
  movUid: z.number().int().positive(),
});

export async function POST(
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

  const body = await req.json().catch(() => null);
  const parsed = AddMovie.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { movUid } = parsed.data;

  try {
    await query(
      `INSERT INTO public.collection_movies (collection_id, mov_uid)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [collectionId, movUid]
    );

    return NextResponse.json(
      { ok: true, collectionId, movUid },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/collections/[id]/movies error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
