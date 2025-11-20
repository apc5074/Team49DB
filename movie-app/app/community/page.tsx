"use client";

import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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

  const [pending, setPending] = useState<
    Record<string, "follow" | "unfollow" | undefined>
  >({});

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

  const followingSet = useMemo(
    () => new Set(following.map((u) => u.email.toLowerCase())),
    [following]
  );

  async function follow(email: string) {
    const key = email.toLowerCase();
    if (pending[key]) return;
    setPending((p) => ({ ...p, [key]: "follow" }));
    setErr(null);

    const existing = followers.find((u) => u.email.toLowerCase() === key);
    const prevFollowing = following;
    if (existing && !followingSet.has(key)) {
      setFollowing((f) => [existing, ...f]);
    }

    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to follow");
      }
    } catch (e: any) {
      setFollowing(prevFollowing);
      setErr(e?.message || "Failed to follow");
    } finally {
      setPending((p) => {
        const { [key]: _, ...rest } = p;
        return rest;
      });
    }
  }

  async function unfollow(email: string) {
    const key = email.toLowerCase();
    if (pending[key]) return;
    setPending((p) => ({ ...p, [key]: "unfollow" }));
    setErr(null);

    const prevFollowing = following;
    setFollowing((f) => f.filter((u) => u.email.toLowerCase() !== key));

    try {
      const res = await fetch("/api/follows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to unfollow");
      }
    } catch (e: any) {
      setFollowing(prevFollowing);
      setErr(e?.message || "Failed to unfollow");
    } finally {
      setPending((p) => {
        const { [key]: _, ...rest } = p;
        return rest;
      });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="container mx-auto px-4 py-10">
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

        {err && <div className="mb-6 text-sm text-destructive">{err}</div>}

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

          <TabsContent value="following" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                People you&apos;re following
              </div>
              <AddFriendDialog onAdded={load} />
            </div>

            <PeopleGrid
              items={filteredFollowing}
              loading={loading}
              emptyLabel="You're not following anyone yet."
              renderActions={(u) => (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => unfollow(u.email)}
                  disabled={pending[u.email.toLowerCase()] === "unfollow"}
                >
                  {pending[u.email.toLowerCase()] === "unfollow"
                    ? "Removing…"
                    : "Unfollow"}
                </Button>
              )}
            />
          </TabsContent>

          <TabsContent value="followers" className="mt-6">
            <PeopleGrid
              items={filteredFollowers}
              loading={loading}
              emptyLabel="No one is following you yet."
              renderActions={(u) => {
                const isFollowing = followingSet.has(u.email.toLowerCase());
                const pend = pending[u.email.toLowerCase()];
                if (isFollowing) {
                  return (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => unfollow(u.email)}
                      disabled={pend === "unfollow"}
                    >
                      {pend === "unfollow" ? "Removing…" : "Unfollow"}
                    </Button>
                  );
                }
                return (
                  <Button
                    size="sm"
                    onClick={() => follow(u.email)}
                    disabled={pend === "follow"}
                  >
                    {pend === "follow" ? "Following…" : "Follow back"}
                  </Button>
                );
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PeopleGrid({
  items,
  loading,
  emptyLabel,
  renderActions,
}: {
  items: CommunityUser[];
  loading: boolean;
  emptyLabel: string;
  renderActions?: (u: CommunityUser) => React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-lg bg-card/60 border border-border animate-pulse"
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((u) => (
        <Card
          key={u.user_id}
          className="bg-card/60 backdrop-blur-sm border border-border hover:border-foreground/40 transition-colors"
        >
          <CardContent className="pt-6 pb-4 flex flex-col items-center text-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {initials(u.first_name, u.last_name, u.username, u.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 w-full">
              <div className="font-semibold truncate">{displayName(u)}</div>
              {u.username && (
                <div className="text-xs text-muted-foreground truncate">
                  @{u.username}
                </div>
              )}
              <div className="text-xs text-muted-foreground truncate">
                {u.email}
              </div>
            </div>
            <div className="w-full">
              {renderActions?.(u)}
            </div>
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