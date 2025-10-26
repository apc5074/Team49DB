// components/explore/ExploreClient.tsx
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
  cast: string[];
  studios: string[]; // NEW
  // release_year?: number; // ← later
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
    | "studio";
  // | "release_year";
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
  }, [sp.toString()]);

  const [qInput, setQInput] = useState(q);
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== q) update({ q: qInput, page: 1 });
    }, 300);
    return () => clearTimeout(t);
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
      | "studio" /* | "release_year" */
  ) {
    if (sort === key) toggleOrder();
    else update({ sort: key, order: "asc", page: 1 });
  }

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
              {/* <SelectItem value="release_year">Release Year</SelectItem> */}
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
        <div className="grid grid-cols-12 px-4 py-3 text-xs text-muted-foreground">
          <button
            className="text-left col-span-3 font-medium"
            onClick={() => onHeaderSort("title")}
          >
            Title
          </button>
          <div className="col-span-3">Directors</div>
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
            className="text-left col-span-1 font-medium"
            onClick={() => onHeaderSort("duration")}
          >
            Length
          </button>
          <button
            className="text-left col-span-1 font-medium"
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
                className="px-4 py-4 grid grid-cols-12 gap-3 items-start"
              >
                <div className="col-span-3">
                  <a
                    href={`/explore/${m.mov_uid}`}
                    className="font-medium hover:underline"
                  >
                    {m.title}
                  </a>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.genres.slice(0, 3).map((g) => (
                      <Badge key={`${m.mov_uid}-${g}`} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="col-span-3 text-sm">
                  {m.directors.length ? m.directors.join(", ") : "—"}
                </div>
                <div className="col-span-2 text-sm">
                  {m.genres.length ? m.genres.join(", ") : "—"}
                </div>
                <div className="col-span-2 text-sm">
                  {m.studios.length ? m.studios.join(", ") : "—"}
                </div>
                <div className="col-span-1 text-sm">
                  {m.duration != null ? `${m.duration} min` : "—"}
                </div>
                <div className="col-span-1 text-sm">
                  {m.avg_rating != null ? m.avg_rating.toFixed(1) : "—"}
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
