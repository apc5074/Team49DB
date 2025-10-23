// app/home/[collectionId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Play, Plus, MoreHorizontal, Clock, Folder } from "lucide-react";

type MovieRow = {
  id: number; // mov_uid
  title: string;
  genre?: string | null;
  duration?: string | null; // e.g., "148m"
  year?: number | string | null;
  poster?: string | null; // URL optional for later
};

export default function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Add dialog state
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [movUid, setMovUid] = useState<string>("");

  async function fetchMovies() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}/movie`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data: MovieRow[] = await res.json();
      setMovies(data);
    } catch (e: any) {
      setErr(e?.message || "Failed to load movies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (collectionId) fetchMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  async function addMovie() {
    const id = Number(movUid);
    if (!Number.isInteger(id) || id <= 0) {
      setErr("Enter a valid numeric movie ID (mov_uid).");
      return;
    }
    setAdding(true);
    setErr(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}/movie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movUid: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to add movie");
      }
      // Refetch to show real DB fields (title/genre/year/etc.)
      await fetchMovies();
      setOpen(false);
      setMovUid("");
    } catch (e: any) {
      setErr(e?.message || "Failed to add movie");
    } finally {
      setAdding(false);
    }
  }

  const count = useMemo(() => movies.length, [movies]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      {/* Header */}
      <div className="bg-gradient-to-b from-card/60 to-background border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Folder className="h-4 w-4" />
            <span>Collection</span>
            <span>•</span>
            <span className="text-foreground font-medium">
              ID: {collectionId}
            </span>
          </div>

          <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            My Favorites
          </h1>

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">You</span>
            <span>•</span>
            <span>{count} movies</span>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-gradient-to-b from-card/40 to-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="default"
                className="h-14 w-14 rounded-full"
              >
                <Play className="h-6 w-6" />
              </Button>

              {/* Add Movie */}
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                onClick={() => setOpen(true)}
                title="Add movie"
              >
                <Plus className="h-6 w-6" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                title="More"
              >
                <MoreHorizontal className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/collections">
                <Button variant="ghost">Back to Collections</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="container mx-auto px-4">
          <div className="text-sm text-destructive mb-4">{err}</div>
        </div>
      )}

      {/* Table */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-[16px_6fr_2fr_1fr_1fr] gap-4 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground">
          <div className="text-center">#</div>
          <div>Title</div>
          <div>Genre</div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Duration
          </div>
          <div>Year</div>
        </div>

        <div className="pb-10">
          {loading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded-md bg-card/50 border border-border animate-pulse"
                />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="text-sm text-muted-foreground px-4 py-6">
              No movies in this collection yet.
            </div>
          ) : (
            movies.map((movie, index) => (
              <div
                key={movie.id}
                className="group grid grid-cols-[16px_6fr_2fr_1fr_1fr] gap-4 rounded-md px-4 py-2 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-center text-sm text-muted-foreground group-hover:text-foreground">
                  {index + 1}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary text-2xl">
                    {/* If you later have poster URLs, replace with <Image /> */}
                    {movie.poster ? "🖼️" : "🎞️"}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {movie.title}
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  {movie.genre ?? "—"}
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  {movie.duration ?? "—"}
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  {movie.year ?? "—"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Movie Dialog (by mov_uid) */}
      <Dialog open={open} onOpenChange={(v) => !adding && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a movie</DialogTitle>
            <DialogDescription>
              Enter the movie ID (<code>mov_uid</code>) from your database.
              We’ll add it and refresh the list.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="movUid">Movie ID (mov_uid)</Label>
            <Input
              id="movUid"
              placeholder="e.g., 12345"
              value={movUid}
              onChange={(e) => setMovUid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMovie()}
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={addMovie}
              disabled={adding || !movUid.trim()}
              className="gap-2"
            >
              {adding ? "Adding..." : "Add Movie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
