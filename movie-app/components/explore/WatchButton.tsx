"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

type Props = {
  movieId: number;
  initialWatched: boolean;
  initialWatchedAt: string | null;
};

export default function WatchButton({
  movieId,
  initialWatched,
  initialWatchedAt,
}: Props) {
  const router = useRouter();
  const [isWatched, setIsWatched] = useState(initialWatched);
  const [watchedAt, setWatchedAt] = useState<string | null>(initialWatchedAt);
  const [submitting, setSubmitting] = useState(false);

  async function markWatchedNow() {
    setSubmitting(true);
    const optimisticPrev = { isWatched, watchedAt };

    setIsWatched(true);
    const nowIso = new Date().toISOString();
    setWatchedAt(nowIso);

    try {
      const res = await fetch(`/api/movie/${movieId}/watch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // server defaults to NOW()
      });
      if (!res.ok) throw new Error("Failed to update watch");
      toast.success("Marked as watched");
      router.refresh(); // <- pull fresh user.watched_at from the API
    } catch (err) {
      setIsWatched(optimisticPrev.isWatched);
      setWatchedAt(optimisticPrev.watchedAt);
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(`Couldn’t mark watched: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={markWatchedNow} disabled={submitting}>
        {submitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Mark watched (now)
      </Button>

      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" />
        {watchedAt ? new Date(watchedAt).toLocaleString() : "Not watched"}
      </div>
    </div>
  );
}
