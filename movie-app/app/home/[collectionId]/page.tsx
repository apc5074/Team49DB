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
import {
  Play,
  Plus,
  MoreHorizontal,
  Clock,
  Folder,
  Trash2,
} from "lucide-react";

type MovieRow = {
  id: number;
  title: string;
  genre?: string | null;
  duration?: string | null;
  year?: number | string | null;
};

type Choice = { movUid: number; title: string; year: number | null };

export default function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  // Add-by-ID state
  const [movUid, setMovUid] = useState<string>("");

  // Add-by-title state
  const [mode, setMode] = useState<"id" | "title">("id");
  const [title, setTitle] = useState<string>("");
  const [year, setYear] = useState<string>("");

  // If backend returns 409 with choices:
  const [choices, setChoices] = useState<Choice[]>([]);
  const [picking, setPicking] = useState(false);

  const [removingId, setRemovingId] = useState<number | null>(null);

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
  }, [collectionId]);

  async function addMovie() {
    setErr(null);
    setAdding(true);
    setChoices([]);
    setPicking(false);

    try {
      let payload: any;

      if (mode === "id") {
        const id = Number(movUid);
        if (!Number.isInteger(id) || id <= 0) {
          throw new Error("Enter a valid numeric movie ID (mov_uid).");
        }
        payload = { movUid: id };
      } else {
        const t = title.trim();
        if (!t) throw new Error("Enter a movie title.");
        const y = year.trim() ? Number(year.trim()) : undefined;
        if (y != null && (!Number.isInteger(y) || y < 1800 || y > 2100)) {
          throw new Error("Enter a valid year (1800–2100) or leave blank.");
        }
        payload = y ? { title: t, year: y } : { title: t };
      }

      const res = await fetch(`/api/collections/${collectionId}/movie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        // Multiple matches – show choices
        const data = await res.json().catch(() => ({}));
        const cs: Choice[] = Array.isArray(data?.choices) ? data.choices : [];
        if (!cs.length)
          throw new Error(
            data?.error || "Multiple matches—no choices returned."
          );
        setChoices(cs);
        setPicking(true);
        return; // keep dialog open for picking
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to add movie");
      }

      await fetchMovies();
      resetAddDialog();
    } catch (e: any) {
      setErr(e?.message || "Failed to add movie");
    } finally {
      setAdding(false);
    }
  }

  async function pickChoice(movUid: number) {
    // finalize by explicit movUid
    setErr(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}/movie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movUid }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to add movie");
      }
      await fetchMovies();
      resetAddDialog();
    } catch (e: any) {
      setErr(e?.message || "Failed to add movie");
    } finally {
      setAdding(false);
    }
  }

  function resetAddDialog() {
    setOpen(false);
    setMovUid("");
    setTitle("");
    setYear("");
    setChoices([]);
    setPicking(false);
    setMode("id");
  }

  async function removeMovie(id: number) {
    if (!Number.isInteger(id) || id <= 0) return;
    setErr(null);
    setRemovingId(id);

    const prev = movies;
    setMovies((m) => m.filter((row) => row.id !== id));

    try {
      const res = await fetch(
        `/api/collections/${collectionId}/movie?movUid=${id}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to remove movie");
      }
    } catch (e: any) {
      setMovies(prev);
      setErr(e?.message || "Failed to remove movie");
    } finally {
      setRemovingId(null);
    }
  }

  const count = useMemo(() => movies.length, [movies]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

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
              <Link href="/home">
                <Button variant="ghost">Back to Collections</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="container mx-auto px-4">
          <div className="text-sm text-destructive mb-4">{err}</div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-[16px_6fr_2fr_1fr_1fr_40px] gap-4 border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground">
          <div className="text-center">#</div>
          <div>Title</div>
          <div>Genre</div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Duration
          </div>
          <div>Year</div>
          <div className="text-right"> </div>
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
                className="group grid grid-cols-[16px_6fr_2fr_1fr_1fr_40px] gap-4 rounded-md px-4 py-2 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-center text-sm text-muted-foreground group-hover:text-foreground">
                  {index + 1}
                </div>

                <div className="flex items-center gap-4">
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

                <div className="flex items-center justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Remove from collection"
                    onClick={() => removeMovie(movie.id)}
                    disabled={removingId === movie.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => !adding && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a movie</DialogTitle>
            <DialogDescription>
              Add by <strong>ID</strong> or by <strong>Title</strong>. If
              multiple movies match a title, you’ll be asked to pick one.
            </DialogDescription>
          </DialogHeader>

          {/* Mode switch */}
          <div className="flex gap-2 mb-2">
            <Button
              variant={mode === "id" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("id")}
            >
              By ID
            </Button>
            <Button
              variant={mode === "title" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("title")}
            >
              By Title
            </Button>
          </div>

          {/* Fields */}
          {mode === "id" ? (
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
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder='e.g., "Dune"'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMovie()}
                autoFocus
              />
              <Label
                htmlFor="year"
                className="mt-2 text-sm text-muted-foreground"
              >
                Year (optional)
              </Label>
              <Input
                id="year"
                placeholder="e.g., 2021"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMovie()}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>
          )}

          {/* Choices from 409 (multiple matches) */}
          {picking && choices.length > 0 && (
            <div className="mt-4 border border-border rounded-md p-3">
              <p className="text-sm mb-2">Multiple matches — pick one:</p>
              <div className="space-y-2">
                {choices.map((c) => (
                  <div
                    key={c.movUid}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <span className="text-sm">
                      {c.title} {c.year ? `(${c.year})` : ""}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => pickChoice(c.movUid)}
                      disabled={adding}
                    >
                      Choose
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={resetAddDialog} disabled={adding}>
              Cancel
            </Button>
            <Button
              onClick={addMovie}
              disabled={
                adding || (mode === "id" ? !movUid.trim() : !title.trim())
              }
              className="gap-2"
            >
              {adding ? (picking ? "Adding…" : "Adding…") : "Add Movie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
