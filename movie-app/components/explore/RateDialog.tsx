"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  movieId: number;
  initialRating: number | null;
  min?: number;
  max?: number;
};

export default function RateDialog({
  movieId,
  initialRating,
  min = 1,
  max = 5,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | "">(initialRating ?? "");
  const [submitting, setSubmitting] = useState(false);

  function resetLocal() {
    setRating(initialRating ?? "");
  }

  async function submitRating() {
    if (rating === "" || typeof rating !== "number") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/movie/${movieId}/rate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating_value: rating }),
      });
      if (!res.ok) throw new Error("Failed to rate");
      toast.success(`Saved rating: ${rating}`);
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(`Couldn’t save rating: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function clearRating() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/movie/${movieId}/rate`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear rating");
      toast.success("Cleared rating");
      setRating("");
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(`Couldn’t clear rating: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Star className="h-4 w-4 mr-2" />
        Rate
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetLocal();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate this movie</DialogTitle>
            <DialogDescription>
              Choose a value from {min} to {max}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="movie-rating">Rating</Label>
            <Input
              id="movie-rating"
              type="number"
              min={min}
              max={max}
              step={1}
              value={rating}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Number(e.target.value);
                setRating(v);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {typeof rating === "number"
                ? `You’ll save: ${rating}`
                : "No rating yet"}
            </p>
          </div>

          <DialogFooter className="gap-2">
            {initialRating != null && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearRating}
                disabled={submitting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRating}
              disabled={submitting || rating === ""}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Star className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
