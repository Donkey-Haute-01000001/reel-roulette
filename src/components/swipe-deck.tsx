"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { Bookmark, Info, RotateCcw } from "lucide-react";

import type { Movie } from "@/lib/types";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MoviePoster } from "@/components/movie-poster";
import { addToWatchlist } from "@/lib/watchlist-client";
import { shuffle } from "@/lib/utils";

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

export function SwipeDeck({ movies }: { movies: Movie[] }) {
  const mounted = useMounted();
  const [queue, setQueue] = React.useState<Movie[]>(movies);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [exitDirection, setExitDirection] = React.useState<"left" | "right" | null>(null);
  const [exitingMovie, setExitingMovie] = React.useState<Movie | null>(null);
  const [savedCount, setSavedCount] = React.useState(0);
  const [seenCount, setSeenCount] = React.useState(0);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

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
      setPhase("exiting");
      setExitDirection(direction);
      setExitingMovie(current);
      setSeenCount((c) => c + 1);
      if (direction === "right") {
        setSavedCount((c) => c + 1);
        setToast(`Saved "${current.title}" to your Watch Deck`);
        void addToWatchlist(current.id);
      } else {
        setToast(`Rerolled "${current.title}"`);
      }

      setQueue((prev) => {
        const rest = prev.slice(1);
        if (rest.length === 0 && movies.length > 0) {
          return nextBag(movies, current.id);
        }
        return rest;
      });
    },
    [phase, current, movies]
  );

  // Only reveal the next card once the exit animation has genuinely
  // finished. Guarded so a second `onAnimationComplete` fire (e.g. the
  // drag-elastic snap-back racing the exit) can't advance the deck twice.
  const finishExit = React.useCallback(() => {
    if (phase !== "exiting") return;
    setPhase("idle");
    setExitDirection(null);
    setExitingMovie(null);
  }, [phase]);

  if (movies.length === 0) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-center">
        <p className="font-display text-xl font-bold">No movies match these filters</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Try widening your genre or mood picks — or connect Supabase if this atlas is still
          empty.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto h-[560px] w-full max-w-sm sm:h-[600px]">
        <AnimatePresence initial={false}>
          {displayedMovie && (
            <SwipeCard
              key={displayedMovie.id}
              movie={displayedMovie}
              exiting={phase === "exiting" ? exitDirection : null}
              onExitComplete={finishExit}
              onSwipeStart={commitSwipe}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          size="icon"
          variant="outline"
          className="size-14 border-destructive/40 text-destructive hover:bg-destructive/10"
          aria-label="Reroll"
          disabled={!displayedMovie || phase !== "idle"}
          onClick={() => commitSwipe("left")}
        >
          <RotateCcw className="size-6" />
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
          className="size-14 bg-primary text-primary-foreground hover:brightness-110"
          aria-label="Save to Watch Deck"
          disabled={!displayedMovie || phase !== "idle"}
          onClick={() => commitSwipe("right")}
        >
          <Bookmark className="size-6" />
        </Button>
      </div>

      <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Swipe or use the buttons — {seenCount} seen · {savedCount} saved
      </p>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-lg">
          {toast}
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          {displayedMovie && (
            <>
              <MoviePoster
                genre={displayedMovie.primary_genre}
                title={displayedMovie.title}
                year={displayedMovie.release_year}
                className="-mx-6 -mt-6 mb-2 h-40"
              />
              <DialogHeader>
                <DialogTitle>
                  {displayedMovie.title} ({displayedMovie.release_year})
                </DialogTitle>
                <DialogDescription>
                  Directed by {displayedMovie.director} · {displayedMovie.runtime_minutes} min ·
                  rated {displayedMovie.rating.toFixed(1)}/10
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-foreground/90">
                {displayedMovie.synopsis}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SwipeCard({
  movie,
  exiting,
  onExitComplete,
  onSwipeStart,
}: {
  movie: Movie;
  exiting: "left" | "right" | null;
  onExitComplete: (direction: "left" | "right") => void;
  onSwipeStart: (direction: "left" | "right") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
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
          ? {
              x: exiting === "right" ? 700 : -700,
              rotate: exiting === "right" ? 24 : -24,
              opacity: 0,
              transition: { duration: 0.35, ease: "easeIn" },
            }
          : { scale: 1, opacity: 1, y: 0, transition: { duration: 0.25 } }
      }
      exit={{ opacity: 0 }}
      onAnimationComplete={() => {
        if (exiting) onExitComplete(exiting);
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) onSwipeStart("right");
        else if (info.offset.x < -SWIPE_THRESHOLD) onSwipeStart("left");
      }}
    >
      <motion.span
        style={{ opacity: saveOpacity }}
        className="absolute top-6 left-6 z-10 -rotate-12 rounded-lg border-4 border-primary px-3 py-1 font-display text-2xl font-black text-primary"
      >
        SAVE
      </motion.span>
      <motion.span
        style={{ opacity: skipOpacity }}
        className="absolute top-6 right-6 z-10 rotate-12 rounded-lg border-4 border-destructive px-3 py-1 font-display text-2xl font-black text-destructive"
      >
        SKIP
      </motion.span>
      <MovieCard movie={movie} className="h-full shadow-2xl" />
    </motion.div>
  );
}
