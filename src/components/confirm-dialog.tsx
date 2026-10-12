"use client";

import * as React from "react";

import { Ornament } from "@/components/broadside";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// A serious question on a broadside placard, for anything that can't be
// taken back (Fold, returning every discard): the crimson button does it,
// the one beside it, closing, or clicking away all leave things be.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busyLabel: string;
  cancelLabel: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);

  const confirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      {/* A bare frame around a broadside placard, as with the other dialogs */}
      <DialogContent showClose={false} className="max-w-sm border-0 bg-transparent p-3 text-ink shadow-none">
        <div className="broadside px-6 py-5 text-center">
          <DialogTitle className="font-display text-2xl uppercase">{title}</DialogTitle>
          <Ornament className="my-2 text-ink" />
          <DialogDescription className="font-serif text-sm text-ink">{children}</DialogDescription>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              size="sm"
              className="border-crimson bg-crimson text-paper hover:brightness-110"
              disabled={busy}
              onClick={confirm}
            >
              {busy ? busyLabel : confirmLabel}
            </Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// The question for returning every discard, asked from the Swipe deck and
// the Watch Deck alike.
export function ShuffleAllDiscardsDialog({
  open,
  onOpenChange,
  count,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Shuffle Your Discards Back In?"
      confirmLabel="Shuffle Them In"
      busyLabel="Shuffling…"
      cancelLabel="Leave Them"
      onConfirm={onConfirm}
    >
      All {count} discarded {count === 1 ? "picture returns" : "pictures return"} to the deck, to be
      dealt again. There&apos;s no taking it back.
    </ConfirmDialog>
  );
}
