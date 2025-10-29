import { Badge } from "@/components/ui/badge";
import { Star, Clock, Users, Calendar, Film } from "lucide-react";

type MovieResponse = {
  duration: number | null;
  age_rating: string | null;
  genres: string[];
  cast: Array<{ name: string; character?: string }>;
  user: {
    rating_value: number | null;
    watched_at: string | null;
  };
};

type MovieAugmented = MovieResponse & {
  directors?: string[];
  avg_rating?: number | null;
  rating_count?: number | null;
};

export default function MovieDetails({ movie }: { movie: MovieAugmented }) {
  const avg = movie.avg_rating ?? null;
  const count = movie.rating_count ?? null;
  const directors = movie.directors ?? [];

  const renderStars = (rating: number) => {
    const rounded = Math.max(0, Math.min(5, Math.round(rating)));
    return (
      <div
        className="flex gap-1"
        aria-label={`${rounded} out of 5 stars`}
        title={`${rounded} / 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= rounded;
          return (
            <Star
              key={star}
              aria-hidden="true"
              className={`w-5 h-5 stroke-current stroke-[1.75] ${
                filled
                  ? "text-amber-400 fill-amber-400 drop-shadow-sm"
                  : "text-muted-foreground/40 fill-transparent"
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <section className="space-y-8">
      {/* Hero Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Duration Card */}
        {movie.duration && (
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {movie.duration} min
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Average Rating Card */}
        {avg !== null && (
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:border-accent/50 hover:shadow-[0_0_30px_-5px_hsl(var(--accent)/0.3)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <Star className="w-4 h-4" />
                Average Rating
              </div>
              <div className="flex items-baseline gap-2">
                {/* high-contrast number */}
                <span className="text-2xl font-bold text-foreground">
                  {avg.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">/ 5.0</span>
              </div>
              <div className="mt-3">{renderStars(avg)}</div>
            </div>
          </div>
        )}

        {/* Your Rating Card */}
        {movie.user.rating_value !== null && (
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:border-accent/50 hover:shadow-[0_0_30px_-5px_hsl(var(--accent)/0.3)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Your Rating
              </div>
              <div className="flex items-baseline gap-2">
                {/* high-contrast number */}
                <span className="text-2xl font-bold text-foreground">
                  {movie.user.rating_value}
                </span>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
              <div className="mt-3">{renderStars(movie.user.rating_value)}</div>
            </div>
          </div>
        )}

        {/* Last Watched Card */}
        {movie.user.watched_at && (
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                Last Watched
              </div>
              <div className="text-sm font-medium text-foreground">
                {new Date(movie.user.watched_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(movie.user.watched_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {movie.age_rating && (
          <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Age Rating
            </div>
            <div className="text-lg font-semibold text-foreground">
              {movie.age_rating}
            </div>
          </div>
        )}
        {count !== null && (
          <div className="rounded-xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              Total Ratings
            </div>
            <div className="text-lg font-semibold text-foreground">
              {count.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Genres */}
      {movie.genres.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Film className="w-5 h-5 text-primary" />
            Genres
          </h2>
          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <Badge
                key={g}
                variant="secondary"
                className="px-4 py-2 text-sm font-medium bg-secondary/60 hover:bg-secondary border border-border/50 transition-all hover:scale-105"
              >
                {g}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Directors */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Directors</h2>
          {directors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No directors listed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {directors.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="group rounded-xl border border-border/50 bg-gradient-to-br from-card/60 to-card/30 px-5 py-3 backdrop-blur-sm transition-all hover:border-accent/50 hover:shadow-[0_0_20px_-5px_hsl(var(--accent)/0.3)]"
                >
                  <div className="font-semibold text-foreground">{name}</div>
                  <div className="text-xs text-muted-foreground">Director</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cast */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Top Cast</h2>
          {movie.cast.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cast listed.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {movie.cast.map((c, i) => (
                <div
                  key={`${c.name}-${i}`}
                  className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/60 to-card/30 p-5 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)] hover:-translate-y-1"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground">
                      {c.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {c.character ?? "Unknown role"}
                    </div>
                  </div>
                  <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl transition-all group-hover:bg-primary/10" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
