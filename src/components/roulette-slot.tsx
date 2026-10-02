"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { animate, motion, useMotionValue, type MotionValue } from "motion/react";
import { Bookmark, BookmarkCheck, Dices } from "lucide-react";

import type { Genre, Movie } from "@/lib/types";
import { EMPTY_FILTERS, applyFilters } from "@/lib/movie-filters";
import { DAILY_SPINS, getSpinsRemaining, recordSpin } from "@/lib/roulette-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { FilterBar } from "@/components/filter-bar";
import { MovieCard } from "@/components/movie-card";
import { MoviePoster } from "@/components/movie-poster";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn, shuffle } from "@/lib/utils";

type Source = "deck" | "catalog";

const TILE_H = 112;
// Each reel travels further and stops later than the one to its left, so
// they land left → middle → right ~350ms apart.
const REEL_FILLERS = [24, 29, 34];
const REEL_DURATIONS = [1.7, 2.05, 2.4];
const REEL_EASE = [0.15, 0.85, 0.25, 1] as const;

// Every strip is laid out so its *stop* row is the second-to-last tile: the
// last three tiles are what's visible once it lands (above / payline /
// below). That makes the next spin seamless — it starts from those same
// three tiles at y = 0.
function stopOffset(strip: Movie[]) {
  return -(strip.length - 3) * TILE_H;
}

function buildStrip(pool: Movie[], target: Movie, startTiles: Movie[], fillers: number) {
  const tiles: Movie[] = [];
  while (tiles.length < fillers) tiles.push(...shuffle(pool));
  // Keep the rows right above and below the payline off the target when the
  // pool allows it, so the winning row reads clearly.
  const others = pool.filter((m) => m.id !== target.id);
  const neighbour = () => (others.length ? shuffle(others)[0] : target);
  return [...startTiles, ...tiles.slice(0, fillers - 1), neighbour(), target, neighbour()];
}

export function RouletteSlot({
  deckMovies,
  catalog,
  genres,
  savedIds,
  onSave,
}: {
  deckMovies: Movie[];
  catalog: Movie[];
  genres: Genre[];
  savedIds: Set<number>;
  onSave: (movie: Movie) => Promise<void>;
}) {
  const [source, setSource] = React.useState<Source>("deck");
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [spinsLeft, setSpinsLeft] = React.useState<number | null>(null);
  const [spinning, setSpinning] = React.useState(false);
  const [strips, setStrips] = React.useState<Movie[][] | null>(null);
  const [landed, setLanded] = React.useState(0);
  const [result, setResult] = React.useState<Movie | null>(null);
  const [saving, setSaving] = React.useState(false);

  const y0 = useMotionValue(0);
  const y1 = useMotionValue(0);
  const y2 = useMotionValue(0);
  const reelYs = [y0, y1, y2];

  React.useEffect(() => {
    getSpinsRemaining().then(setSpinsLeft);
  }, []);

  const pool = source === "deck" ? deckMovies : catalog;
  const filtered = React.useMemo(() => applyFilters(pool, filters), [pool, filters]);

  // Before the first spin the reels just preview the current pool
  // (deterministic, so it renders the same on server and client).
  const preview = React.useMemo(
    () =>
      filtered.length === 0
        ? null
        : [0, 1, 2].map((r) => [0, 1, 2].map((i) => filtered[(r + i) % filtered.length])),
    [filtered]
  );
  const shownStrips = strips ?? preview;

  let blockedReason: string | null = null;
  if (spinsLeft === null) blockedReason = "Checking your spins…";
  else if (spinsLeft <= 0) blockedReason = "Out of spins. Come back tomorrow!";
  else if (source === "deck" && deckMovies.length === 0)
    blockedReason = "Your Watch Deck is empty. Save some movies or spin the whole catalog.";
  else if (filtered.length === 0) blockedReason = "No movies match these filters.";

  const spin = async () => {
    if (spinning || blockedReason) return;
    setSpinning(true);
    setResult(null);
    setLanded(0);

    // Re-check against the server right before spinning, in case another tab
    // used up today's spins.
    if (isSupabaseConfigured) {
      const remaining = await getSpinsRemaining();
      if (remaining <= 0) {
        setSpinsLeft(0);
        setSpinning(false);
        return;
      }
    }

    // Decide first, animate after: the target is fixed before any reel moves,
    // and every reel is built to stop exactly on it.
    const target = shuffle(filtered)[0];
    const after = await recordSpin();
    setSpinsLeft((prev) => after ?? Math.max(0, (prev ?? DAILY_SPINS) - 1));

    const next = [0, 1, 2].map((r) =>
      buildStrip(filtered, target, (shownStrips?.[r] ?? []).slice(-3), REEL_FILLERS[r])
    );
    // Commit the new strips and reset to y = 0 in the same frame, so the
    // reels never flash the old strip at the new offset.
    flushSync(() => setStrips(next));
    reelYs.forEach((y) => y.set(0));

    await Promise.all(
      reelYs.map(
        (y, r) =>
          new Promise<void>((resolve) => {
            animate(y, stopOffset(next[r]), {
              duration: REEL_DURATIONS[r],
              ease: REEL_EASE,
              onComplete: () => {
                setLanded((n) => n + 1);
                resolve();
              },
            });
          })
      )
    );

    setResult(target);
    setSpinning(false);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    await onSave(result);
    setSaving(false);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Spin for:
          </span>
          <Segmented
            label="Spin pool"
            value={source}
            onChange={setSource}
            disabled={spinning}
            options={[
              { value: "deck", label: `Watch Deck (${deckMovies.length})` },
              { value: "catalog", label: `Whole catalog (${catalog.length})` },
            ]}
          />
        </div>
        <FilterBar genres={genres} value={filters} onChange={setFilters} disabled={spinning} />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-3 shadow-xl sm:p-4">
        <div className="relative grid grid-cols-3 gap-2">
          {[0, 1, 2].map((r) => (
            <Reel
              key={r}
              strip={shownStrips?.[r] ?? null}
              y={reelYs[r]}
              won={landed > r && result !== null}
            />
          ))}
          {/* Payline across the middle row */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 border-y-2 transition-colors",
              result ? "border-primary" : "border-primary/35"
            )}
            style={{ top: TILE_H, height: TILE_H }}
          />
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={spinning || blockedReason !== null}
            onClick={spin}
          >
            <Dices className="size-5" />
            {spinning ? "Spinning…" : "Spin"}
          </Button>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {spinsLeft === null
              ? `${DAILY_SPINS} spins a day`
              : `${spinsLeft} ${spinsLeft === 1 ? "spin" : "spins"} left today`}
          </p>
          {blockedReason && !spinning && (
            <p role="status" className="text-center text-sm text-muted-foreground">
              {blockedReason}
            </p>
          )}
        </div>
      </div>

      {result && (
        <motion.div
          key={`${result.id}-${spinsLeft}`}
          className="flex w-full max-w-sm flex-col items-center gap-3"
          initial={{ opacity: 0, y: 24, rotateY: 90 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="text-xs font-bold tracking-wide text-primary uppercase">Your pick</p>
          <MovieCard movie={result} className="h-[560px] shadow-2xl" />
          {savedIds.has(result.id) ? (
            <Button variant="outline" disabled className="gap-1.5">
              <BookmarkCheck className="size-4" /> In your Watch Deck
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Bookmark className="size-4" /> Save to Watch Deck
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Reel({
  strip,
  y,
  won,
}: {
  strip: Movie[] | null;
  y: MotionValue<number>;
  won: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl bg-background"
      style={{ height: TILE_H * 3 }}
    >
      <motion.div style={{ y }}>
        {strip
          ? strip.map((movie, i) => (
              <div key={i} className="p-1" style={{ height: TILE_H }}>
                <MoviePoster
                  variant="mini"
                  genre={movie.primary_genre}
                  title={movie.title}
                  year={movie.release_year}
                  className={cn(
                    "h-full w-full",
                    won && i === strip.length - 2 && "ring-2 ring-primary"
                  )}
                />
              </div>
            ))
          : [0, 1, 2].map((i) => (
              <div key={i} className="p-1" style={{ height: TILE_H }}>
                <div className="h-full w-full rounded-lg border border-dashed border-border" />
              </div>
            ))}
      </motion.div>
      {/* Fade the rows above and below the payline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/80 via-transparent to-card/80"
      />
    </div>
  );
}
