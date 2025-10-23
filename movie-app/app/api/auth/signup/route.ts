import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const SignUpSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(254),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(8).max(256),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = SignUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { firstName, lastName, email, username, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await query<{ user_id: number }>(
      `
      INSERT INTO p320_49.user
        (first_name, last_name, email, username, password_hash, account_creation_date, last_access_date)
      VALUES
        ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING user_id
      `,
      [firstName, lastName, email, username, passwordHash]
    );

    return NextResponse.json(
      {
        ok: true,
        userId: rows[0].user_id,
        firstName,
        lastName,
        email,
        username,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/auth/signup error:", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      table: "p320_49.users",
    });

    if (err?.code === "23505") {
      const msg = /email/i.test(err?.detail || err?.constraint || "")
        ? "Email already in use"
        : /username/i.test(err?.detail || err?.constraint || "")
        ? "Username already taken"
        : "Duplicate value";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    if (err?.code === "42P01") {
      return NextResponse.json(
        { error: "Table p320_49.users not found (schema mismatch)." },
        { status: 500 }
      );
    }
    if (err?.code === "42703") {
      return NextResponse.json(
        {
          error: "Column name mismatch in p320_49.users. Verify column names.",
        },
        { status: 500 }
      );
    }
    if (err?.code === "23502") {
      return NextResponse.json(
        {
          error:
            "A required column is missing a default (check user_id identity/default).",
        },
        { status: 500 }
      );
    }
    if (err?.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Permission denied on p320_49.users. Re-check grants for your app role.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
