"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Film } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const id = String(fd.get("email") || "").trim(); // email or username
    const password = String(fd.get("password") || "");

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Sign in failed");
      }

      router.replace("/home");
    } catch (err: any) {
      setError(err?.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card/60 backdrop-blur-md border border-border rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Film className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-black">
              CineVault
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Sign in to continue your movie journey
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email or Username</Label>
            <Input
              id="email"
              name="email"
              type="text"
              placeholder="you@example.com or yourname"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="mt-1"
              required
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 shadow-glow mt-4"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="relative text-center">
          <span className="absolute inset-x-0 top-1/2 h-px bg-border"></span>
          <span className="relative bg-card px-3 text-muted-foreground text-xs uppercase">
            or
          </span>
        </div>

        <div className="text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            Don’t have an account?
          </p>
          <Link href="/sign-up">
            <Button
              variant="secondary"
              className="w-full gap-2 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 transition-all"
            >
              Create Account
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-muted-foreground text-xs mt-8">
        &copy; 2025 CineVault. All rights reserved.
      </p>
    </div>
  );
}
