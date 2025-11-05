"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserPlus,
  UserMinus,
  Search,
  Film,
  FolderOpen,
  Gauge,
  Repeat2,
  ListOrdered,
} from "lucide-react";
import AddFriendDialog from "@/components/community/AddFriendDialog";

// --- Types shared with your existing Community page ---
export type CommunityUser = {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string;
};

export type Collection = {
  collectionId: number;
  name: string;
  userId: number;
  movieCount: number;
  created_at?: string;
};

// --- Social Page ---
export default function SocialPage() {
  const [following, setFollowing] = useState<CommunityUser[]>([]);
  const [followers, setFollowers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Placeholders: collections + top movies (wire these up later)
  // Swap these out for real fetches once your APIs are ready
  const [collections, setCollections] = useState<Collection[]>([]);

  const [topMovies /* , setTopMovies */] = useState<
    { id: string | number; title: string; year?: number }[]
  >([
    // TODO: replace with top 10 movies data for the signed-in user
    // { id: "tt0111161", title: "The Shawshank Redemption", year: 1994 },
  ]);

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
      setErr(e?.message || "Failed to load social data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Uses the signed-in context (same pattern as Community page)
    load();
  }, []);

  // Fetch collections same as CollectionsPage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/collections", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data: Collection[] = await res.json();
        if (!cancelled) setCollections(data);
      } catch {
        // Soft-fail; followers/following still load
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const totalCollections = useMemo(() => collections.length, [collections]);

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
              Social
            </h1>
            <p className="text-muted-foreground">
              Your followers, who you follow, your collections, and your top
              movies.
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

        {/* Overview stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Followers"
            value={followers.length}
            sublabel={loading ? "Loading…" : `${followers.length} total`}
          />
          <StatCard
            icon={<UserPlus className="h-5 w-5" />}
            label="Following"
            value={following.length}
            sublabel={loading ? "Loading…" : `${following.length} total`}
          />
          <StatCard
            icon={<FolderOpen className="h-5 w-5" />}
            label="Collections"
            value={totalCollections}
            sublabel={loading ? "Loading…" : `${totalCollections} total`}
          />
          <StatCard
            icon={<Film className="h-5 w-5" />}
            label="Top 10 Movies"
            value={topMovies.length}
            sublabel={
              topMovies.length ? `${topMovies.length} ranked` : "Placeholder"
            }
          />
        </section>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="overview" className="gap-2">
              <Gauge className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <UserPlus className="h-4 w-4" /> Following ({following.length})
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-2">
              <Users className="h-4 w-4" /> Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="collections" className="gap-2">
              <FolderOpen className="h-4 w-4" /> Collections
            </TabsTrigger>
            <TabsTrigger value="top10" className="gap-2">
              <ListOrdered className="h-4 w-4" /> Top 10 Movies
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle>People you follow</CardTitle>
                </CardHeader>
                <CardContent>
                  <PeopleGrid
                    items={filteredFollowing.slice(0, 6)}
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
                  {following.length > 6 && (
                    <div className="mt-3 text-right">
                      <Link href="#following">
                        <Button variant="ghost" size="sm">
                          View all
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle>Your followers</CardTitle>
                </CardHeader>
                <CardContent>
                  <PeopleGrid
                    items={filteredFollowers.slice(0, 6)}
                    loading={loading}
                    emptyLabel="No one is following you yet."
                    renderActions={(u) => {
                      const isFollowing = followingSet.has(
                        u.email.toLowerCase()
                      );
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
                  {followers.length > 6 && (
                    <div className="mt-3 text-right">
                      <Link href="#followers">
                        <Button variant="ghost" size="sm">
                          View all
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/60 lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Your Collections</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    (Placeholder)
                  </div>
                </CardHeader>
                <CardContent>
                  {collections.length === 0 ? (
                    <EmptyPlaceholder
                      icon={FolderOpen}
                      label="Collections coming soon"
                    />
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {collections.map((c) => (
                        <Card
                          key={c.collectionId}
                          className="bg-card/60 border-dashed"
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base truncate">
                              {c.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0 text-sm text-muted-foreground">
                            {c.movieCount}{" "}
                            {c.movieCount === 1 ? "movie" : "movies"}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/60 lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Your Top 10 Movies</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    (Placeholder)
                  </div>
                </CardHeader>
                <CardContent>
                  {topMovies.length === 0 ? (
                    <EmptyPlaceholder
                      icon={Film}
                      label="Top 10 list coming soon"
                    />
                  ) : (
                    <ol className="list-decimal pl-6 space-y-2">
                      {topMovies.slice(0, 10).map((m, i) => (
                        <li key={m.id} className="truncate">
                          {m.title}
                          {m.year ? (
                            <span className="text-muted-foreground">
                              {" "}
                              ({m.year})
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FOLLOWING */}
          <TabsContent id="following" value="following" className="mt-6">
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

          {/* FOLLOWERS */}
          <TabsContent id="followers" value="followers" className="mt-6">
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

          {/* COLLECTIONS (placeholder) */}
          <TabsContent value="collections" className="mt-6">
            {collections.length === 0 ? (
              <EmptyPlaceholder
                icon={FolderOpen}
                label="Collections coming soon"
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((c) => (
                  <Card
                    key={c.collectionId}
                    className="bg-card/60 border-dashed"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base truncate">
                        {c.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground">
                      {c.movieCount} {c.movieCount === 1 ? "movie" : "movies"}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TOP 10 MOVIES (placeholder) */}
          <TabsContent value="top10" className="mt-6">
            {topMovies.length === 0 ? (
              <EmptyPlaceholder icon={Film} label="Top 10 list coming soon" />
            ) : (
              <ol className="list-decimal pl-6 space-y-2">
                {topMovies.slice(0, 10).map((m) => (
                  <li key={m.id} className="truncate">
                    {m.title}
                    {m.year ? (
                      <span className="text-muted-foreground"> ({m.year})</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// --- UI Bits ---
function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sublabel?: string;
}) {
  return (
    <Card className="bg-card/60 backdrop-blur-sm border border-border">
      <CardContent className="py-5 flex items-center gap-4">
        <div className="p-2 rounded-xl border border-border/60 bg-background/40">
          {icon}
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold leading-tight">{value}</div>
          {sublabel ? (
            <div className="text-xs text-muted-foreground mt-0.5">
              {sublabel}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPlaceholder({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Card className="bg-card/60 border-dashed">
      <CardContent className="py-12 text-center">
        <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
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
          <CardContent className="pt-0 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">
              {u.email}
            </span>
            <div className="flex items-center gap-2">
              <Link href={`/profile/${u.user_id}`}>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </Link>
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
