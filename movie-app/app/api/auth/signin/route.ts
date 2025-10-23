import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

const TABLE = `p320_49."user"`;
const COL = {
  userId: "user_id",
  firstName: "first_name",
  lastName: "last_name",
  email: "email",
  username: "username",
  passwordHash: "password_hash",
  lastAccess: "last_access_date",
} as const;

const SignInSchema = z.object({
  id: z.string().min(1, "Email or username is required").max(254), // email or username
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = SignInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { id, password } = parsed.data;

  try {
    const findSql = `
      SELECT
        ${COL.userId}       AS user_id,
        ${COL.firstName}    AS first_name,
        ${COL.lastName}     AS last_name,
        ${COL.email}        AS email,
        ${COL.username}     AS username,
        ${COL.passwordHash} AS password_hash
      FROM ${TABLE}
      WHERE lower(${COL.email}) = lower($1) OR lower(${COL.username}) = lower($1)
      LIMIT 1
    `;
    const { rows } = await query<{
      user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      username: string;
      password_hash: string | null;
    }>(findSql, [id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = rows[0];
    if (!user.password_hash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await query(
      `UPDATE ${TABLE} SET ${COL.lastAccess} = NOW() WHERE ${COL.userId} = $1`,
      [user.user_id]
    );

    await createSession({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          userId: user.user_id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          username: user.username,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/auth/signin error:", {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
