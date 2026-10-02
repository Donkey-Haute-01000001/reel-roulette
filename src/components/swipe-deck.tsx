"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  AnimatePresence,
} from "motion/react";
import Link from "next/link";
import { Bookmark, Info, X } from "lucide-react";

import type { Movie } from "@/lib/types";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MovieDetails } from "@/components/movie-details";
import { CardBack } from "@/components/card-back";
import { addToWatchlist } from "@/lib/watchlist-client";
import { markSeen } from "@/lib/seen-client";
import { cn, shuffle } from "@/lib/utils";

// A fresh shuffled pass over the whole pool, only ever built once the
// previous bag is exhausted — never a partial reshuffle while cards from
// the current pass are still queued. Swaps the excluded (just-seen) movie
// off the front so it can't repeat back-to-back.
function nextBag(pool: Movie[], excludeId: number | null): Movie[] {
  const bag = shuffle(pool);
  if (excludeId != null && bag.length > 1 && bag[0].id === excludeId) {
    const swapIndex = bag.findIndex((m) => m.id !== excludeId);
    if (swapIndex > 0) [bag[0], bag[swapIndex]] = [bag[swapIndex], bag[0]];
  }
  return bag;
}

const SWIPE_THRESHOLD = 110;

// Sized off the window height (leaving room for the nav, header, filters and
// buttons) so the whole swipe screen fits without scrolling.
const CARD_HEIGHT = "clamp(260px, calc(100dvh - 476px), 440px)";
// The Discard / Keep piles either side of the card, at 42% of its size.
const PILE_SCALE = 0.42;
const PILE_WIDTH = `calc(${CARD_HEIGHT} * ${(5 / 7) * PILE_SCALE})`;

type ExitTarget = { x: number; y: number; scale: number; rotate: number };

// Shuffling uses Math.random(), which necessarily differs between the
// server-rendered pass and the client's hydration pass — so the *first*
// render has to be deterministic (unshuffled) on both sides, and the
// randomness only applied once we know we're safely past hydration.
// useSyncExternalStore's server snapshot forces that first client render to
// agree with the server; its client snapshot flips true right after, giving
// a hydration-safe way to detect "we're now client-only" without the
// setState-in-effect anti-pattern.
function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

type Phase = "idle" | "exiting";

export function SwipeDeck({
  movies,
  loading = false,
  emptyTitle = "No Pictures Match",
  emptyBody = "Pray widen your genre or mood selections.",
  emptyAction,
  onSave,
  onSeen,
}: {
  movies: Movie[];
  // While the Watch Deck loads (so saved cards can be left out), show a
  // face-down card instead of dealing.
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  // Extra control shown with the empty states (e.g. shuffle seen cards back in).
  emptyAction?: React.ReactNode;
  onSave?: (movie: Movie) => void;
  onSeen?: (movie: Movie) => void;
}) {
  const mounted = useMounted();
  const [queue, setQueue] = React.useState<Movie[]>(movies);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [exitDirection, setExitDirection] = React.useState<"left" | "right" | null>(null);
  const [exitingMovie, setExitingMovie] = React.useState<Movie | null>(null);
  const [savedCount, setSavedCount] = React.useState(0);
  const [seenCount, setSeenCount] = React.useState(0);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  // Cards played since this deck was dealt, either way: saved ones are in
  // your Watch Deck and seen ones are recorded as seen, so neither is dealt
  // again in a later pass.
  const [playedHere, setPlayedHere] = React.useState<Set<number>>(() => new Set());
  // Swiped cards land face-up on a pile: Discard on the left, Keep on the right.
  const [seenPile, setSeenPile] = React.useState<Movie[]>([]);
  const [savedPile, setSavedPile] = React.useState<Movie[]>([]);
  // Where the exiting card flies to: onto its pile, or (with the piles
  // hidden on small screens) off the side of the screen.
  const [exitTarget, setExitTarget] = React.useState<ExitTarget | null>(null);
  const cardAreaRef = React.useRef<HTMLDivElement>(null);
  const seenPileRef = React.useRef<HTMLDivElement>(null);
  const savedPileRef = React.useRef<HTMLDivElement>(null);

  // Rebuild the queue whenever the filtered movie pool changes. (Adjusting
  // state during render, per React's guidance, rather than in an effect —
  // `movies` is a stable, memoized reference upstream so this only fires
  // when the filters actually change.)
  const [prevMovies, setPrevMovies] = React.useState(movies);
  if (movies !== prevMovies) {
    setPrevMovies(movies);
    setQueue(movies);
    setPhase("idle");
    setExitDirection(null);
    setExitingMovie(null);
    setSeenCount(0);
  }

  // Once mounted (and whenever a fresh, unshuffled queue shows up), shuffle
  // exactly once. `shuffledFor` tracks which `movies` reference we've last
  // shuffled, so this is a plain derived-state comparison — no refs, no
  // effect — that naturally stops re-firing once it matches.
  const [shuffledFor, setShuffledFor] = React.useState<Movie[] | null>(null);
  if (mounted && shuffledFor !== movies && movies.length > 0) {
    setShuffledFor(movies);
    setQueue(shuffle(movies));
  }

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const current = queue[0];
  // While a card is exiting, keep showing the card that's actually
  // animating off screen — `queue[0]` has already advanced past it (the
  // next card is decided at swipe-commit time, below).
  const displayedMovie = phase === "exiting" ? exitingMovie : current;

  // Decide the next card the instant a swipe is committed (drag threshold
  // crossed, or a button pressed) — not when the exit animation finishes.
  // This closes the double-fire race: once `phase` flips to "exiting", the
  // guard below ignores any further commit attempts until it flips back.
  const commitSwipe = React.useCallback(
    (direction: "left" | "right") => {
      if (phase !== "idle" || !current) return;

      const pile = (direction === "right" ? savedPileRef : seenPileRef).current;
      const area = cardAreaRef.current;
      let target: ExitTarget | null = null;
      // offsetParent is null while the piles are display:none (small screens).
      if (pile && area && pile.offsetParent !== null) {
        const a = area.getBoundingClientRect();
        const p = pile.getBoundingClientRect();
        target = {
          x: p.left + p.width / 2 - (a.left + a.width / 2),
          y: p.top + p.height / 2 - (a.top + a.height / 2),
          scale: p.width / a.width,
          rotate: direction === "right" ? 6 : -6,
        };
      }
      setExitTarget(target);
      setPhase("exiting");
      setExitDirection(direction);
      setExitingMovie(current);
      setSeenCount((c) => c + 1);
      const played = new Set(playedHere).add(current.id);
      setPlayedHere(played);
      if (direction === "right") {
        setSavedCount((c) => c + 1);
        setToast(`"${current.title}" Added to Your Watch Deck`);
        void addToWatchlist(current.id);
        onSave?.(current);
      } else {
        setToast(`"${current.title}" · Discarded`);
        void markSeen(current.id);
        onSeen?.(current);
      }

      setQueue((prev) => {
        const rest = prev.slice(1);
        if (rest.length === 0 && movies.length > 0) {
          return nextBag(
            movies.filter((m) => !played.has(m.id)),
            current.id
          );
        }
        return rest;
      });
    },
    [phase, current, movies, playedHere, onSave, onSeen]
  );

  // Only reveal the next card once the exit animation has genuinely
  // finished. Guarded so a second `onAnimationComplete` fire (e.g. the
  // drag-elastic snap-back racing the exit) can't advance the deck twice.
  const finishExit = React.useCallback(() => {
    if (phase !== "exiting") return;
    // The card has landed: it now lives on top of its pile.
    if (exitingMovie) {
      if (exitDirection === "right") setSavedPile((pile) => [...pile, exitingMovie]);
      else setSeenPile((pile) => [...pile, exitingMovie]);
    }
    setPhase("idle");
    setExitDirection(null);
    setExitingMovie(null);
  }, [phase, exitingMovie, exitDirection]);

  if (loading) {
    return (
      <div className="mx-auto aspect-[5/7] animate-pulse" style={{ height: CARD_HEIGHT }}>
        <CardBack className="shadow-2xl" />
      </div>
    );
  }

  // Nothing to deal: either nothing matches, or every card has been played.
  if (movies.length === 0 || (!displayedMovie && phase === "idle")) {
    const allPlayed = movies.length > 0;
    return (
      <div
        style={{ height: CARD_HEIGHT }}
        className="broadside mx-auto flex aspect-[5/7] flex-col items-center justify-center gap-3 px-6 text-center"
      >
        <p className="font-display text-xl uppercase">
          {allPlayed ? "That's the Whole Deck" : emptyTitle}
        </p>
        <p className="max-w-xs font-serif text-sm italic">
          {allPlayed
            ? "Every picture here has been played. Widen your selections, or go play your Watch Deck."
            : emptyBody}
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-8 lg:gap-14">
        <Pile pileRef={seenPileRef} cards={seenPile} label="Discard" tone="crimson" rotate={-6} />
        <div ref={cardAreaRef} className="relative mx-auto aspect-[5/7]" style={{ height: CARD_HEIGHT }}>
          <AnimatePresence initial={false}>
            {displayedMovie && (
              <SwipeCard
                key={displayedMovie.id}
                movie={displayedMovie}
                exiting={phase === "exiting" ? exitDirection : null}
                exitTarget={exitTarget}
                onExitComplete={finishExit}
                onSwipeStart={commitSwipe}
              />
            )}
          </AnimatePresence>
        </div>
        <Pile
          pileRef={savedPileRef}
          cards={savedPile}
          label="Keep"
          tone="felt"
          rotate={6}
          href="/watchlist"
          linkLabel="Go to your Watch Deck"
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <Button
          size="icon"
          variant="outline"
          className="size-12 border-ink/60 bg-paper text-crimson hover:bg-paper-deep"
          aria-label="Discard"
          disabled={!displayedMovie || phase !== "idle"}
          onClick={() => commitSwipe("left")}
        >
          <X className="size-6" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Details"
          disabled={!displayedMovie || phase !== "idle"}
          onClick={() => setDetailOpen(true)}
        >
          <Info className="size-5" />
        </Button>
        <Button
          size="icon"
          className="size-12 border-gold bg-felt text-paper hover:brightness-115"
          aria-label="Keep in your Watch Deck"
          disabled={!displayedMovie || phase !== "idle"}
          onClick={() => commitSwipe("right")}
        >
          <Bookmark className="size-6" />
        </Button>
      </div>

      <p className="mt-3 font-slab text-[9px] tracking-[0.2em] text-gold-light/80 uppercase">
        {seenCount} {seenCount === 1 ? "Card" : "Cards"} Played · {savedCount} Saved
      </p>

      {toast && (
        <div className="broadside fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 py-2 font-serif text-sm font-bold">
          {toast}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        {/* A bare frame around a broadside placard, so the dialog's own
            card styling doesn't fight the paper. */}
        <DialogContent className="max-h-[85dvh] overflow-y-auto border-0 bg-transparent p-3 text-ink shadow-none">
          {displayedMovie && (
            <div className="broadside px-6 py-5">
              <DialogTitle className="sr-only">{displayedMovie.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Details for {displayedMovie.title}
              </DialogDescription>
              <MovieDetails movie={displayedMovie} kicker="The Particulars" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// A pile of swiped cards beside the deck, top card face-up. Hidden on
// small screens, where swiped cards fly off the side instead.
function Pile({
  pileRef,
  cards,
  label,
  tone,
  rotate,
  href,
  linkLabel,
}: {
  pileRef: React.RefObject<HTMLDivElement | null>;
  cards: Movie[];
  label: string;
  tone: "crimson" | "felt";
  rotate: number;
  href?: string;
  linkLabel?: string;
}) {
  const top = cards[cards.length - 1];
  const body = (
    <>
      {/* Measured for the landing animation, so it stays unrotated. */}
      <div ref={pileRef} className="relative aspect-[5/7]" style={{ width: PILE_WIDTH }}>
        {top ? (
          <div className="absolute inset-0" style={{ rotate: `${rotate}deg` }}>
            {cards.length > 1 && (
              <div
                className="card-stock absolute inset-0 rounded-[6%/4.3%] border border-[#d3c39f] shadow-md"
                style={{ rotate: `${-rotate * 0.8}deg`, translate: `${-rotate * 0.4}px 3px` }}
              />
            )}
            <MovieCard movie={top} className="shadow-[0_8px_18px_rgb(0_0_0/0.5)]" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[8px] border-2 border-dashed border-gold/45 p-2 text-center">
            <span className="font-slab text-[8px] leading-relaxed tracking-[0.18em] text-gold-light/70 uppercase">
              {label}
            </span>
          </div>
        )}
      </div>
      <span
        className={cn(
          "font-slab text-[9px] tracking-[0.18em] uppercase",
          tone === "crimson" ? "text-[#e8857f]" : "text-[#8fd3a6]"
        )}
      >
        {label} · {cards.length}
      </span>
    </>
  );

  const className = "hidden flex-col items-center gap-3 sm:flex";
  return href ? (
    <Link href={href} className={cn(className, "group transition-transform hover:-translate-y-1")} aria-label={linkLabel}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function SwipeCard({
  movie,
  exiting,
  exitTarget,
  onExitComplete,
  onSwipeStart,
}: {
  movie: Movie;
  exiting: "left" | "right" | null;
  exitTarget: ExitTarget | null;
  onExitComplete: (direction: "left" | "right") => void;
  onSwipeStart: (direction: "left" | "right") => void;
}) {
  const x = useMotionValue(0);
  // Tilt follows the drag until the swipe is committed; from then on the
  // exit animation owns it (a derived value would fight that animation).
  const rotate = useMotionValue(0);
  useMotionValueEvent(x, "change", (v) => {
    if (!exiting) rotate.set(Math.max(-18, Math.min(18, (v / 300) * 18)));
  });
  const saveOpacity = useTransform(x, [20, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, -20], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag={exiting ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={
        exiting
          ? exitTarget
            ? {
                // Fly onto the pile, shrinking to the pile's size as it lands.
                x: exitTarget.x,
                y: exitTarget.y,
                scale: exitTarget.scale,
                rotate: exitTarget.rotate,
                transition: { duration: 0.42, ease: [0.45, 0, 0.2, 1] },
              }
            : {
                x: exiting === "right" ? 700 : -700,
                rotate: exiting === "right" ? 24 : -24,
                opacity: 0,
                transition: { duration: 0.35, ease: "easeIn" },
              }
          : { scale: 1, opacity: 1, y: 0, transition: { duration: 0.25 } }
      }
      // Gone instantly once landed: the pile is already showing this card.
      exit={{ opacity: 0, transition: { duration: exitTarget ? 0 : 0.2 } }}
      onAnimationComplete={() => {
        if (exiting) onExitComplete(exiting);
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onSwipeStart("right");
        else if (info.offset.x < -SWIPE_THRESHOLD) onSwipeStart("left");
      }}
    >
      {/* The stamps fade as the card takes off for its pile */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10"
        animate={{ opacity: exiting ? 0 : 1 }}
        transition={{ duration: 0.15 }}
      >
        <motion.span
          style={{ opacity: saveOpacity }}
          className="absolute top-[12%] left-4 z-10 -rotate-12 rounded-[3px] border-4 border-double border-felt bg-paper/80 px-2 py-0.5 font-woodtype text-lg text-felt"
        >
          KEEP
        </motion.span>
        <motion.span
          style={{ opacity: skipOpacity }}
          className="absolute top-[12%] right-4 z-10 rotate-12 rounded-[3px] border-4 border-double border-crimson bg-paper/80 px-2 py-0.5 font-woodtype text-lg text-crimson"
        >
          DISCARD
        </motion.span>
      </motion.div>
      <MovieCard movie={movie} className="shadow-2xl" />
    </motion.div>
  );
}
