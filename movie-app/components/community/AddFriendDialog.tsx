"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Loader2, UserPlus } from "lucide-react";

type Props = {
  onAdded?: () => void;
  triggerLabel?: string;
  renderTrigger?: (open: () => void) => React.ReactNode;
};

export default function AddFriendDialog({
  onAdded,
  triggerLabel = "Add friend",
  renderTrigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setOpen(true);
  }

  function closeDialog() {
    if (!submitting) setOpen(false);
  }

  function parseApiError(status: number, data: any): string {
    if (typeof data?.error === "string") return data.error;

    const zodErr = data?.error?.email?._errors?.[0];
    if (typeof zodErr === "string") return zodErr;

    if (status === 404) return "User not found";
    if (status === 400) return "Invalid email or cannot follow this user";
    return "Failed to add friend";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(parseApiError(res.status, data));
      }

      // Success: reset + notify + close
      setEmail("");
      onAdded?.();
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openDialog)
      ) : (
        <Button onClick={openDialog}>
          <UserPlus className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => (v ? openDialog() : closeDialog())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a friend</DialogTitle>
            <DialogDescription>
              Enter your friend’s email. If they have an account, you’ll start
              following them.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="friend-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="friend-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                disabled={submitting}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Add friend"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
