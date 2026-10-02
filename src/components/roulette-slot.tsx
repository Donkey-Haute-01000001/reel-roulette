"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { Bookmark, Dices, HelpCircle, Layers } from "lucide-react";

import type { Genre, Movie } from "@/lib/types";
import { GENRE_META } from "@/lib/genre-meta";
import { EMPTY_FILTERS, applyFilters } from "@/lib/movie-filters";
import { DAILY_SPINS, getSpinsRemaining, recordSpin } from "@/lib/roulette-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { FilterBar } from "@/components/filter-bar";
import { MovieCard } from "@/components/movie-card";
import { MovieDetails } from "@/components/movie-details";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { cn, shuffle } from "@/lib/utils";

type Source = "deck" | "catalog";

const TILE_H = 100;
// Each reel travels further and stops later than the one to its left, so
// they land left → middle → right ~350ms apart.
const REEL_FILLERS = [24, 29, 34];
const REEL_DURATIONS = [1.7, 2.05, 2.4];
const REEL_EASE = [0.15, 0.85, 0.25, 1] as const;
const BULBS = 14;
const LEVER_TRAVEL = 84;

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
  onSave: (movie: Movie) => Promise<boolean>;
}) {
  const [source, setSource] = React.useState<Source>("deck");
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [spinsLeft, setSpinsLeft] = React.useState<number | null>(null);
  const [spinning, setSpinning] = React.useState(false);
  const [strips, setStrips] = React.useState<Movie[][] | null>(null);
  const [landed, setLanded] = React.useState(0);
  const [result, setResult] = React.useState<Movie | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveFailed, setSaveFailed] = React.useState(false);

  const y0 = useMotionValue(0);
  const y1 = useMotionValue(0);
  const y2 = useMotionValue(0);
  const reelYs = [y0, y1, y2];
  // The pull lever: the knob drops, the rod shortens with it, then springs back.
  const knobY = useMotionValue(0);
  const rodHeight = useTransform(knobY, (v) => LEVER_TRAVEL + 24 - v);

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
  if (spinsLeft === null) blockedReason = "Consulting the house ledger…";
  else if (spinsLeft <= 0) blockedReason = "The machine rests for tonight. Return tomorrow for three fresh spins.";
  else if (source === "deck" && deckMovies.length === 0)
    blockedReason = "Your Watch Deck stands empty. Save a few pictures, or spin the whole catalogue.";
  else if (filtered.length === 0) blockedReason = "No pictures answer to those particulars.";

  const spin = async () => {
    if (spinning || blockedReason) return;
    setSpinning(true);
    setResult(null);
    setLanded(0);
    animate(knobY, [0, LEVER_TRAVEL, 0], { duration: 0.7, times: [0, 0.35, 1], ease: "easeInOut" });

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
    setSaveFailed(false);
    // On success the parent navigates to the Watch Deck table.
    const ok = await onSave(result);
    if (!ok) {
      setSaving(false);
      setSaveFailed(true);
    }
  };

  const canSpin = !spinning && blockedReason === null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-slab text-[10px] tracking-[0.2em] text-gold-light uppercase">
            Spin For:
          </span>
          <Segmented
            label="Spin pool"
            value={source}
            onChange={setSource}
            disabled={spinning}
            options={[
              { value: "deck", label: `Watch Deck (${deckMovies.length})` },
              { value: "catalog", label: `Whole Catalogue (${catalog.length})` },
            ]}
          />
        </div>
        <FilterBar genres={genres} value={filters} onChange={setFilters} disabled={spinning} />
      </div>

      <div className="relative w-full max-w-md sm:pr-10">
        {/* Gold trim around the cabinet */}
        <div
          className="rounded-[28px] p-[3px] shadow-2xl shadow-black/60"
          style={{
            background: "linear-gradient(160deg, #f6dc8c, #a7791c 35%, #f6dc8c 55%, #8a6417)",
          }}
        >
          <div className="rounded-[25px] bg-gradient-to-b from-[#2c2c33] to-[#121215] p-3 sm:p-4">
            {/* Marquee */}
            <div className="mb-3 rounded-2xl bg-[#0b0b0e] px-4 py-2.5 text-center">
              <Bulbs spinning={spinning} won={result !== null} />
              <p className="my-1.5 font-woodtype text-3xl tracking-[0.3em] text-[#f6dc8c] [text-shadow:0_0_12px_rgba(246,220,140,0.55)]">
                SPIN
              </p>
              <Bulbs spinning={spinning} won={result !== null} reverse />
            </div>

            {/* Reel window */}
            <div className="relative rounded-xl bg-[#0b0b0e] p-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]">
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((r) => (
                  <Reel
                    key={r}
                    strip={shownStrips?.[r] ?? null}
                    y={reelYs[r]}
                    moving={spinning && landed <= r}
                    won={landed > r && result !== null}
                  />
                ))}
              </div>
              {/* Payline through the middle row, with pointers at each end */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0"
                style={{ top: 6 + TILE_H * 1.5 - 1 }}
              >
                <div
                  className={cn(
                    "h-0.5 w-full bg-[#e11d2e] transition-opacity",
                    result ? "opacity-100" : "opacity-50"
                  )}
                />
                <span className="absolute top-1/2 -left-0.5 -translate-y-1/2 border-y-[7px] border-l-[9px] border-y-transparent border-l-[#e11d2e]" />
                <span className="absolute top-1/2 -right-0.5 -translate-y-1/2 border-y-[7px] border-r-[9px] border-y-transparent border-r-[#e11d2e]" />
              </div>
            </div>

            {/* Controls: spin counter + spin button */}
            <div className="mt-3 flex items-stretch gap-3">
              <div className="flex flex-col items-center justify-center rounded-lg bg-black px-3 py-1">
                <span className="text-[9px] font-bold tracking-widest text-[#8a8a92] uppercase">
                  Spins
                </span>
                <span className="font-mono text-2xl leading-none font-bold text-amber-400 [text-shadow:0_0_8px_rgba(251,191,36,0.7)]">
                  {spinsLeft ?? "–"}
                </span>
              </div>
              <Button
                size="lg"
                className="flex-1 gap-2"
                disabled={!canSpin}
                onClick={spin}
              >
                <Dices className="size-5" />
                {spinning ? "Spinning…" : "Spin"}
              </Button>
            </div>
          </div>
        </div>

        {/* Pull lever: a second way to spin */}
        <button
          type="button"
          aria-label="Pull the lever to spin"
          disabled={!canSpin}
          onClick={spin}
          className="group absolute top-[22%] right-0 hidden h-[150px] w-10 disabled:cursor-not-allowed sm:block"
        >
          <motion.span
            className="absolute bottom-6 left-1/2 w-2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#9a9aa2] via-[#f2f2f5] to-[#9a9aa2]"
            style={{ height: rodHeight }}
          />
          <motion.span
            className="absolute top-0 left-1/2 -ml-[13px] size-[26px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a8a,#e11d2e_55%,#7a0a14)] shadow-lg group-enabled:group-hover:brightness-110"
            style={{ y: knobY }}
          />
          <span className="absolute bottom-0 left-1/2 h-7 w-6 -translate-x-1/2 rounded-md bg-gradient-to-b from-[#3a3a42] to-[#16161a] ring-1 ring-[#a7791c]" />
        </button>
      </div>

      <div className="-mt-3 flex flex-col items-center gap-1">
        <p className="font-slab text-[9px] tracking-[0.2em] text-gold-light/80 uppercase">
          {spinsLeft === null
            ? "Three Spins Per Day"
            : spinsLeft === 0
              ? "No Spins Remain Tonight"
              : `${spinsLeft} ${spinsLeft === 1 ? "Spin Remains" : "Spins Remain"} Tonight`}
        </p>
        {blockedReason && !spinning && (
          <p role="status" className="text-center font-serif text-sm text-paper/80 italic">
            {blockedReason}
          </p>
        )}
      </div>

      {result && (
        <motion.div
          key={`${result.id}-${spinsLeft}`}
          className="flex w-full max-w-2xl flex-col items-center gap-6 sm:flex-row sm:items-start"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="w-[180px] shrink-0"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <MovieCard movie={result} className="shadow-2xl shadow-black/60" />
          </motion.div>
          <div className="broadside w-full max-w-md px-5 py-4">
            <MovieDetails movie={result} kicker="The Reels Have Spoken" />
            <div className="mt-3 flex flex-col items-center gap-2">
              {savedIds.has(result.id) ? (
                <Button asChild className="gap-1.5">
                  <Link href={`/watchlist?play=${result.id}`}>
                    <Layers className="size-4" /> See It on the Table
                  </Link>
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Bookmark className="size-4" /> {saving ? "Adding…" : "Add to Watch Deck"}
                </Button>
              )}
              {saveFailed && (
                <p role="alert" className="font-serif text-xs text-crimson italic">
                  The house couldn&apos;t file it just now. Pray try again.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Reel({
  strip,
  y,
  moving,
  won,
}: {
  strip: Movie[] | null;
  y: MotionValue<number>;
  moving: boolean;
  won: boolean;
}) {
  return (
    <div className="card-stock relative overflow-hidden rounded-lg" style={{ height: TILE_H * 3 }}>
      <motion.div
        style={{ y }}
        className={cn("transition-[filter] duration-200", moving && "blur-[1.5px]")}
      >
        {strip
          ? strip.map((movie, i) => (
              <ReelSymbol key={i} movie={movie} won={won && i === strip.length - 2} />
            ))
          : [0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-center border-b border-[#e0d0ad] text-[#c9bfa9]"
                style={{ height: TILE_H }}
              >
                <HelpCircle className="size-8" strokeWidth={1.5} />
              </div>
            ))}
      </motion.div>
      {/* Shading so the strip reads as a curved drum */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.5))",
        }}
      />
    </div>
  );
}

// One symbol on a reel: the movie's suit and title, in the card-stock style.
function ReelSymbol({ movie, won }: { movie: Movie; won: boolean }) {
  const meta = GENRE_META[movie.primary_genre];
  const Icon = meta.icon;

  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 border-b border-[#e0d0ad] px-2 text-center transition-colors"
      style={{
        height: TILE_H,
        background: won ? `color-mix(in srgb, ${meta.color} 22%, transparent)` : undefined,
      }}
    >
      <Icon className="size-8 shrink-0" style={{ color: meta.color }} strokeWidth={1.75} />
      <p className="line-clamp-2 font-display text-[11px] leading-tight text-[#1c1b19] sm:text-xs">
        {movie.title}
      </p>
    </div>
  );
}

// A row of marquee bulbs: chase while spinning, all lit on a win.
function Bulbs({
  spinning,
  won,
  reverse = false,
}: {
  spinning: boolean;
  won: boolean;
  reverse?: boolean;
}) {
  return (
    <div aria-hidden className="flex justify-between px-1">
      {Array.from({ length: BULBS }).map((_, i) => {
        const order = reverse ? BULBS - 1 - i : i;
        return (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-[#ffd36b] shadow-[0_0_6px_#ffd36b]"
            animate={
              spinning
                ? { opacity: [0.2, 1, 0.2] }
                : { opacity: won ? 1 : i % 2 === 0 ? 0.9 : 0.35 }
            }
            transition={
              spinning
                ? { duration: 0.7, repeat: Infinity, delay: (order * 0.7) / BULBS }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
}
