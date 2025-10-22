"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Plus, Folder, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type SessionUser = {
  userId: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
};

type Collection = {
  collection_id: number;
  name: string;
  user_id: number;
  created_at?: string;
};

export default function CollectionsPage() {
  const router = useRouter();

  // session state
  const [sessionLoading, setSessionLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  // collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dialog state
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1) load session
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (!res.ok) throw new Error("unauthorized");
        const data = await res.json();
        if (!cancelled) {
          setUser(data.user as SessionUser);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) redirect if not signed in
  useEffect(() => {
    if (!sessionLoading && !user) {
      router.replace("/signin");
    }
  }, [sessionLoading, user, router]);

  // 3) fetch collections once session is ready
  async function fetchCollections() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections?userId=${user.userId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data: Collection[] = await res.json();
      setCollections(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchCollections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 4) create / rename / delete — now use user.userId
  async function createCollection() {
    if (!user) return;
    const name = newName.trim();
    if (!name) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userId: user.userId }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create collection");
      }
      setOpen(false);
      setNewName("");
      await fetchCollections();
    } catch (e: any) {
      setError(e?.message || "Failed to create collection");
    } finally {
      setSubmitting(false);
    }
  }

  async function renameCollection(id: number) {
    if (!user) return;
    const current = collections.find((c) => c.collection_id === id)?.name ?? "";
    const name = prompt("Rename collection:", current);
    if (name == null || !name.trim()) return;

    const prev = collections;
    setCollections((cs) =>
      cs.map((c) => (c.collection_id === id ? { ...c, name: name.trim() } : c))
    );

    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), userId: user.userId }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e: any) {
      setCollections(prev);
      setError(e?.message || "Failed to rename collection");
    }
  }

  async function deleteCollection(id: number) {
    if (!user) return;
    if (!confirm("Delete this collection? This cannot be undone.")) return;
    const prev = collections;
    setCollections((cs) => cs.filter((c) => c.collection_id !== id));
    try {
      const res = await fetch(`/api/collections/${id}?userId=${user.userId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    } catch (e: any) {
      setCollections(prev);
      setError(e?.message || "Failed to delete collection");
    }
  }

  const empty = useMemo(
    () => !loading && collections.length === 0,
    [loading, collections]
  );

  // While we resolve session, show a soft skeleton
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-card/60 border border-border animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // If redirected, this won’t render; this protects just in case
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-10">
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Your Collections
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user.firstName}! Create lists and group your
              favorite movies by theme, mood, or occasion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/search" className="hidden md:inline-flex">
              <Button variant="ghost" className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </Link>

            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 text-sm text-destructive">
            {typeof error === "string" ? error : "Something went wrong"}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-card/60 border border-border animate-pulse"
              />
            ))}
          </div>
        ) : empty ? (
          <div className="text-center border border-dashed border-border rounded-2xl p-12 bg-card/40">
            <Folder className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium">No collections yet</p>
            <p className="text-muted-foreground">
              Create your first collection to get started.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((c) => (
              <div
                key={c.collection_id}
                className="group bg-card/60 backdrop-blur-sm border border-border hover:border-primary/60 rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/25 flex items-center justify-center">
                      <Folder className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{c.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        ID: {c.collection_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => renameCollection(c.collection_id)}
                      title="Rename"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCollection(c.collection_id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <Link href={`/collections/${c.collection_id}`}>
                    <Button variant="secondary" className="w-full">
                      Open
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Collection Dialog */}
      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create collection</DialogTitle>
            <DialogDescription>Name your new collection.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <label
              htmlFor="collection-name"
              className="text-sm text-muted-foreground"
            >
              Name
            </label>
            <Input
              id="collection-name"
              placeholder="e.g., Watch Later"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCollection()}
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={createCollection}
              disabled={submitting || !newName.trim()}
              className="gap-2"
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
