"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  Search,
  Folder,
  SquarePen,
  LogOut,
  User,
  Users,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/app/hooks/useSession";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const { user, loading, signedIn } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (p: string) => pathname === p;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (res.ok) window.location.href = "/";
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <Film className="w-8 h-8 text-primary" />
          <span className="bg-gradient-primary bg-clip-text text-black">
            CineVault
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {signedIn && (
            <>
              <Link href="/explore">
                <Button
                  variant={isActive("/explore") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </Button>
              </Link>

              <Link href="/home">
                <Button
                  variant={isActive("/home") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Folder className="w-4 h-4" />
                  Collections
                </Button>
              </Link>
            </>
          )}

          {!loading && (
            <>
              {signedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 hover:bg-accent/10 transition-all"
                    >
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">{user?.username}</span>
                      <ChevronDown className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex items-center gap-2 text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      {signingOut ? "Signing out..." : "Sign Out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/sign-in">
                  <Button
                    variant={isActive("/sign-in") ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <SquarePen className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
