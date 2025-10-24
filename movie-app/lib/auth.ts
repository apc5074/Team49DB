import { cookies } from "next/headers";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

const AUTH_COOKIE = "session";
const alg = "HS256";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  userId: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
};

export async function createSession(user: SessionUser, days = 7) {
  const payload: JWTPayload & SessionUser = {
    userId: user.userId,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(getSecret());

  const c = await cookies();
  c.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * days,
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(AUTH_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const token = c.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [alg],
    });
    if (
      typeof payload.userId === "number" &&
      typeof payload.username === "string" &&
      typeof payload.email === "string"
    ) {
      return payload as unknown as SessionUser;
    }
    return null;
  } catch {
    return null;
  }
}
