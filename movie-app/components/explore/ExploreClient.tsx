"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";

type ExploreRow = {
  mov_uid: number;
  title: string;
  duration: number | null;
  age_rating: string | null;
  avg_rating: number | null;
  rating_count: number;
  genres: string[];
  directors: string[];
  cast: string[]; // full list from API; we'll show top 2-3
  studios: string[];
  earliest_release_date: string | null;
  user_rating: number | null; // ⬅️ NEW
};

type ExploreResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: ExploreRow[];
};

export default function ExploreClient({
  initial,
}: {
  initial: ExploreResponse;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [data, setData] = useState<ExploreResponse>(initial);
  const [loading, setLoading] = useState(false);

  const q = sp.get("q") ?? "";
  const genre = sp.get("genre") ?? "";
  const cast = sp.get("cast") ?? "";
  const director = sp.get("director") ?? "";
  const sort = (sp.get("sort") ?? "title") as
    | "title"
    | "avg_rating"
    | "duration"
    | "genre"
    | "studio"
    | "release_date";
  const order = (sp.get("order") ?? "asc") as "asc" | "desc";
  const page = Number(sp.get("page") ?? "1");
  const pageSize = Number(sp.get("pageSize") ?? "20");

  function update(params: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(sp.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    router.replace(`/explore?${next.toString()}`);
  }

  useEffect(() => {
    const fetcher = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/explore?${sp.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        setData(json);
      } catch {
        setData({ total: 0, page: 1, pageSize: 20, items: [] });
      } finally {
        setLoading(false);
      }
    };
    fetcher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) update({ q: qInput, page: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  function toggleOrder() {
    update({ order: order === "asc" ? "desc" : "asc", page: 1 });
  }

  function onHeaderSort(
    key:
      | "title"
      | "avg_rating"
      | "duration"
      | "genre"
      | "studio"
      | "release_date"
  ) {
    if (sort === key) toggleOrder();
    else update({ sort: key, order: "asc", page: 1 });
  }

  // Helper function to format date
  const formatReleaseDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, cast, director, genre, studio…"
              className="pl-9"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </div>

          <Input
            placeholder="Genre"
            className="w-40"
            defaultValue={genre}
            onBlur={(e) =>
              update({ genre: e.target.value || undefined, page: 1 })
            }
          />
          <Input
            placeholder="Cast"
            className="w-40"
            defaultValue={cast}
            onBlur={(e) =>
              update({ cast: e.target.value || undefined, page: 1 })
            }
          />
          <Input
            placeholder="Director"
            className="w-40"
            defaultValue={director}
            onBlur={(e) =>
              update({ director: e.target.value || undefined, page: 1 })
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            defaultValue={sort}
            onValueChange={(v) => update({ sort: v, order: "asc", page: 1 })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="genre">Genre</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="release_date">Release Date</SelectItem>
              <SelectItem value="avg_rating">Avg Rating</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleOrder}
            className="gap-1"
          >
            {order === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {order.toUpperCase()}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60">
        {/* Header */}
        <div className="grid grid-cols-12 px-4 py-3 text-xs text-muted-foreground gap-2">
          <button
            className="text-left col-span-3 font-medium"
            onClick={() => onHeaderSort("title")}
          >
            Title
          </button>
          <div className="col-span-2">Directors</div>
          <button
            className="text-left col-span-2 font-medium"
            onClick={() => onHeaderSort("genre")}
          >
            Genre
          </button>
          <button
            className="text-left col-span-2 font-medium"
            onClick={() => onHeaderSort("studio")}
          >
            Studio
          </button>
          <button
            className="text-left col-span-1 font-medium text-center"
            onClick={() => onHeaderSort("release_date")}
          >
            Release Date
          </button>
          <button
            className="text-left col-span-1 font-medium text-center"
            onClick={() => onHeaderSort("duration")}
          >
            Length
          </button>
          <button
            className="text-left col-span-1 font-medium text-center"
            onClick={() => onHeaderSort("avg_rating")}
          >
            Rating
          </button>
        </div>

        {loading ? (
          <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No movies found.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.items.map((m) => (
              <li
                key={m.mov_uid}
                className="px-4 py-4 grid grid-cols-12 gap-2 items-center hover:bg-muted/50 transition-colors"
              >
                {/* Title + Age + (short) Cast */}
                <div className="col-span-3">
                  <div className="font-medium text-sm truncate" title={m.title}>
                    {m.title}
                  </div>

                  {m.age_rating && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {m.age_rating}
                    </Badge>
                  )}

                  {/* Short cast: show first 3 names for space */}
                  <div
                    className="text-xs text-muted-foreground mt-1 truncate"
                    title={m.cast?.join(", ")}
                  >
                    {m.cast && m.cast.length
                      ? m.cast.slice(0, 3).join(", ")
                      : "—"}
                  </div>
                </div>

                {/* Directors */}
                <div
                  className="col-span-2 text-sm text-muted-foreground truncate"
                  title={m.directors.join(", ")}
                >
                  {m.directors.length ? m.directors.join(", ") : "—"}
                </div>

                {/* Genres */}
                <div
                  className="col-span-2 text-sm truncate"
                  title={m.genres.join(", ")}
                >
                  {m.genres.length ? m.genres.join(", ") : "—"}
                </div>

                {/* Studios */}
                <div
                  className="col-span-2 text-sm text-muted-foreground truncate"
                  title={m.studios.join(", ")}
                >
                  {m.studios.length ? m.studios.join(", ") : "—"}
                </div>

                {/* Release Date */}
                <div className="col-span-1 text-sm text-center whitespace-nowrap">
                  {formatReleaseDate(m.earliest_release_date)}
                </div>

                {/* Duration */}
                <div className="col-span-1 text-sm text-center">
                  {m.duration != null ? `${m.duration}m` : "—"}
                </div>

                {/* Ratings: avg + your rating (second line, small) */}
                <div className="col-span-1 text-sm text-center">
                  <div
                    className="font-medium"
                    title={`Average from ${m.rating_count} ratings`}
                  >
                    {m.avg_rating != null ? m.avg_rating.toFixed(1) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {m.user_rating != null ? `You: ${m.user_rating}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, data.total)} of {data.total}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 })}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= data.total}
            onClick={() => update({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
