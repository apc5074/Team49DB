import { notFound } from "next/navigation";
import { headers } from "next/headers";
import MovieDetails from "@/components/explore/MovieDetails";
import RateDialog from "@/components/explore/RateDialog";
import WatchButton from "@/components/explore/WatchButton";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export type MovieCast = { name: string; character: string | null };
export type MovieResponse = {
  mov_uid: number;
  title: string;
  duration: number | null;
  rating_uid: number | null;
  age_rating: string | null;
  genres: string[];
  cast: MovieCast[];
  directors?: string[];
  avg_rating?: number | null;
  rating_count?: number | null;
  user: {
    watched: boolean;
    watched_at: string | null;
    rating_value: number | null;
    rated_at: string | null;
  };
};

type Params = { id: string };

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host)
    return (
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
      "http://localhost:3000"
    );
  return `${proto}://${host}`;
}

async function getMovie(id: string) {
  const h = await headers();
  const cookieHeader = h.get("cookie") ?? "";
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/movie/${id}`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load movie");
  return res.json();
}

export default async function MoviePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) notFound();

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          {movie.title}
        </h1>
        <div className="flex items-center gap-2">
          <RateDialog
            movieId={movie.mov_uid}
            initialRating={movie.user.rating_value}
          />
          <WatchButton
            movieId={movie.mov_uid}
            initialWatched={movie.user.watched}
            initialWatchedAt={movie.user.watched_at}
          />
        </div>
      </div>
      <Separator className="my-6" />
      <MovieDetails movie={movie} />
    </main>
  );
}
