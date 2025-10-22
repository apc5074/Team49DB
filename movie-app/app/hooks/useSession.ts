"use client";

import { useEffect, useState } from "react";

export function useSession() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<null | {
    userId: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) throw new Error("unauthorized");
        const data = await res.json();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, signedIn: !!user };
}
