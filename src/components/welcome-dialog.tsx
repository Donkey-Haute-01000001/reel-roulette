"use client";

import * as React from "react";
import { Dices, Layers, MoveHorizontal, type LucideIcon } from "lucide-react";

import { Ornament } from "@/components/broadside";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// Once per browser, like the session id in session.ts.
const WELCOMED_KEY = "movie-roulette:welcomed";
// Fired by the "?" in the nav (see openWelcome) to bring the notice back.
const OPEN_EVENT = "movie-roulette:open-welcome";

export function openWelcome() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function hasBeenWelcomed() {
  try {
    return window.localStorage.getItem(WELCOMED_KEY) !== null;
  } catch {
    // No storage (e.g. private mode): don't greet on every page load.
    return true;
  }
}

function markWelcomed() {
  try {
    window.localStorage.setItem(WELCOMED_KEY, "1");
  } catch {
    // Nothing to remember it in; it just shows again next visit.
  }
}

const ACTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MoveHorizontal,
    title: "Swipe",
    body: "Film cards are dealt one at a time. Right keeps one for your Watch Deck; left discards it. Already seen it? Say so.",
  },
  {
    icon: Layers,
    title: "Watch Deck",
    body: "The cards you keep make your hand. Lay one on the table, draw one at random, or call “Hit Me!” for a fresh card from the house. Fold, and the whole hand goes back.",
  },
  {
    icon: Dices,
    title: "Spin",
    body: "Can't choose? Three coins a night: drop one in the slot, pull the lever, and let the reels decide from your deck or the whole catalogue.",
  },
];

// The bill posted at the door: what Reel Roulette is and how to play. Shown
// on a first visit, and again whenever the nav's "?" is pressed.
export function WelcomeDialog() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    // A beat after the page appears, so it doesn't land before the stage does.
    const timer = hasBeenWelcomed() ? undefined : window.setTimeout(show, 500);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.clearTimeout(timer);
    };
  }, []);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) markWelcomed();
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {/* A bare frame around a broadside placard, as with the other dialogs */}
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto border-0 bg-transparent p-3 text-ink shadow-none">
        <div className="broadside px-6 py-5 text-center">
          <p className="font-slab text-[9px] tracking-[0.3em] text-crimson uppercase">
            Step Right Up
          </p>
          <DialogTitle className="mt-1 font-display text-3xl uppercase">Reel Roulette</DialogTitle>
          <DialogDescription className="mt-1 font-serif text-sm text-ink italic">
            Can&apos;t decide what to watch? Build your deck, play a card, or spin the wheel!
          </DialogDescription>
          <Ornament className="my-3 text-ink" />
          <ol className="flex flex-col gap-3 text-left">
            {ACTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-crimson" strokeWidth={1.75} />
                <div>
                  <p className="font-display text-base leading-tight uppercase">{title}</p>
                  <p className="font-serif text-sm leading-snug">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Ornament className="my-3 text-ink" />
          <p className="mb-3 font-serif text-xs text-ink/75 italic">
            Look for the ? beside a control for a word on what it does.
          </p>
          <Button onClick={() => changeOpen(false)}>Deal Me In</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
