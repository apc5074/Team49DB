"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Search, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const pathname = usePathname();
  const isActive = (p: string) => pathname === p;

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
          <Film className="w-8 h-8 text-primary" />
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            CineVault
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/search">
            <Button
              variant={isActive("/search") ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
          </Link>
          <Link href="/collections">
            <Button
              variant={isActive("/collections") ? "default" : "ghost"}
              size="sm"
              className="gap-2"
            >
              <Folder className="w-4 h-4" />
              Collections
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
