import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const SignUpSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email").max(254),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, numbers, ., _, - allowed"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(256),
});

async function readBody(
  req: NextRequest | Request
): Promise<Record<string, unknown> | null> {
  const ctype = req.headers.get("content-type") || "";
  try {
    if (ctype.includes("application/json")) {
      const json = await req.json();
      return typeof json === "object" && json ? json : null;
    }
    if (
      ctype.includes("application/x-www-form-urlencoded") ||
      ctype.includes("multipart/form-data")
    ) {
      const form = await (req as NextRequest).formData();
      return Object.fromEntries(form.entries());
    }
    const json = await req.json().catch(() => null);
    return typeof json === "object" && json ? json : null;
  } catch {
    return null;
  }
}

function normalize(input: Record<string, unknown>) {
  const pick = (k: string) =>
    typeof input[k] === "string" ? String(input[k]).trim() : input[k];
  return {
    firstName: pick("firstName"),
    lastName: pick("lastName"),
    email: pick("email"),
    username: pick("username"),
    password: pick("password"),
  };
}

export async function POST(req: NextRequest) {
  const raw = await readBody(req);
  if (!raw) {
    return NextResponse.json(
      { ok: false, message: "Invalid or missing request body" },
      { status: 400 }
    );
  }
  const body = normalize(raw);

  const parsed = SignUpSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      field: i.path.join(".") || "form",
      message: i.message,
    }));
    return NextResponse.json(
      { ok: false, message: "Invalid input", errors: issues },
      { status: 400 }
    );
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
      constraint: err?.constraint,
      table: "p320_49.user",
    });

    if (err?.code === "23505") {
      const detail = `${err?.detail || err?.constraint || ""}`.toLowerCase();
      const msg = detail.includes("email")
        ? "Email already in use"
        : detail.includes("username")
        ? "Username already taken"
        : "Duplicate value";
      return NextResponse.json({ ok: false, message: msg }, { status: 409 });
    }

    if (err?.code === "42P01") {
      return NextResponse.json(
        {
          ok: false,
          message: "Table p320_49.users not found (schema mismatch).",
        },
        { status: 500 }
      );
    }

    if (err?.code === "42703") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Column name mismatch in p320_49.users. Verify column names.",
        },
        { status: 500 }
      );
    }

    if (err?.code === "23502") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "A required column is missing a default (check user_id identity/default).",
        },
        { status: 500 }
      );
    }

    if (err?.code === "42501") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Permission denied on p320_49.users. Re-check grants for your app role.",
        },
        { status: 500 }
      );
    }

    if (err?.code === "42601") {
      return NextResponse.json(
        {
          ok: false,
          message: "SQL syntax error—verify table/column names and quoting.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
