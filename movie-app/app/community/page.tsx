"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, UserMinus, Search } from "lucide-react";
import AddFriendDialog from "@/components/community/AddFriendDialog";

type CommunityUser = {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string;
};

export default function CommunityPage() {
  const [following, setFollowing] = useState<CommunityUser[]>([]);
  const [followers, setFollowers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // simple client fetch; APIs are session-aware so no userId in query/body
  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [follg, follwrs] = await Promise.all([
        fetch("/api/follows/following", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("Failed loading following");
          return r.json();
        }),
        fetch("/api/follows/followers", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("Failed loading followers");
          return r.json();
        }),
      ]);
      setFollowing(follg);
      setFollowers(follwrs);
    } catch (e: any) {
      setErr(e?.message || "Failed to load community data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const normalize = (u: CommunityUser) =>
    `${u.first_name ?? ""} ${u.last_name ?? ""} ${u.username ?? ""} ${
      u.email
    }`.toLowerCase();

  const filteredFollowing = following.filter((u) =>
    normalize(u).includes(query.toLowerCase())
  );
  const filteredFollowers = followers.filter((u) =>
    normalize(u).includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Community
            </h1>
            <p className="text-muted-foreground">
              See the people you follow and who follows you.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people…"
                className="pl-9 w-64"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="ghost" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Error */}
        {err && <div className="mb-6 text-sm text-destructive">{err}</div>}

        {/* Tabs */}
        <Tabs defaultValue="following" className="w-full">
          <TabsList>
            <TabsTrigger value="following" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Following ({following.length})
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-2">
              <Users className="h-4 w-4" />
              Followers ({followers.length})
            </TabsTrigger>
          </TabsList>

          {/* Following */}
          <TabsContent value="following" className="mt-6">
            {/* Top bar with Add Friend button */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                People you’re following
              </div>
              <AddFriendDialog onAdded={load} />
            </div>

            <PeopleGrid
              items={filteredFollowing}
              loading={loading}
              emptyLabel="You're not following anyone yet."
            />
          </TabsContent>

          {/* Followers */}
          <TabsContent value="followers" className="mt-6">
            <PeopleGrid
              items={filteredFollowers}
              loading={loading}
              emptyLabel="No one is following you yet."
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

function PeopleGrid({
  items,
  loading,
  emptyLabel,
}: {
  items: CommunityUser[];
  loading: boolean;
  emptyLabel: string;
}) {
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-card/60 border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="bg-card/60 border-dashed">
        <CardContent className="py-12 text-center">
          <UserMinus className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((u) => (
        <Card
          key={u.user_id}
          className="bg-card/60 backdrop-blur-sm border border-border hover:border-foreground/40 transition-colors"
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-base">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {initials(u.first_name, u.last_name, u.username, u.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate">{displayName(u)}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {u.username ? `@${u.username}` : u.email}
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate">
              {u.email}
            </span>
            <Link href={`/profile/${u.user_id}`}>
              <Button variant="secondary" size="sm">
                View
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function displayName(u: CommunityUser) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.username || u.email;
}

function initials(
  first?: string | null,
  last?: string | null,
  username?: string | null,
  email?: string
) {
  const a = (first?.[0] || "").toUpperCase();
  const b = (last?.[0] || username?.[0] || email?.[0] || "").toUpperCase();
  return a + b || "U";
}
