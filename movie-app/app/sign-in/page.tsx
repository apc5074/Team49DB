"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Film } from "lucide-react";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Card */}
      <div className="w-full max-w-md bg-card/60 backdrop-blur-md border border-border rounded-2xl shadow-lg p-8 space-y-6">
        {/* Logo / Header */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Film className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CineVault
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Sign in to continue your movie journey
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="mt-1"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 shadow-glow mt-4"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative text-center">
          <span className="absolute inset-x-0 top-1/2 h-px bg-border"></span>
          <span className="relative bg-card px-3 text-muted-foreground text-xs uppercase">
            or
          </span>
        </div>

        {/* Create Account */}
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

      {/* Footer */}
      <p className="text-muted-foreground text-xs mt-8">
        © 2024 CineVault. All rights reserved.
      </p>
    </div>
  );
}
