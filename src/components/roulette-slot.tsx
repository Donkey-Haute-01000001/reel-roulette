"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { animate, motion, useMotionValue, type MotionValue } from "motion/react";
import Link from "next/link";
import { Bookmark, Check, Dices, Film, HelpCircle, Layers, type LucideIcon } from "lucide-react";

import type { Genre, Movie } from "@/lib/types";
import { GENRE_META } from "@/lib/genre-meta";
import { Ornament } from "@/components/broadside";
import { EMPTY_FILTERS, applyFilters } from "@/lib/movie-filters";
import { DAILY_SPINS, getSpinsRemaining, recordSpin } from "@/lib/roulette-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { FilterBar } from "@/components/filter-bar";
import { MovieCard } from "@/components/movie-card";
import { MovieDetails } from "@/components/movie-details";
import { Button } from "@/components/ui/button";
import { CoinSlot, FloatingCoins, Lever, type SlotHint } from "@/components/slot-parts";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn, shuffle } from "@/lib/utils";

type Source = "deck" | "catalog";

const TILE_H = 68;
// Each reel travels further and stops later than the one to its left, so
// they land left → middle → right ~350ms apart.
const REEL_FILLERS = [24, 29, 34];
const REEL_DURATIONS = [1.7, 2.05, 2.4];
const REEL_EASE = [0.15, 0.85, 0.25, 1] as const;
const BULBS = 14;

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
  // The lever's swing, in degrees: 0 = up at rest, 180 = pulled all the way down.
  const leverTheta = useMotionValue(0);
  // Each spin costs a coin: today's coins float beside the machine (one per
  // spin left), and one must be in the slot before the lever will pull.
  const [coins, setCoins] = React.useState<number[] | null>(null);
  const [credited, setCredited] = React.useState(false);
  // Which coin is in the slot, so Coin Return can give that one back.
  const [insertedCoin, setInsertedCoin] = React.useState<number | null>(null);
  const slotRef = React.useRef<HTMLButtonElement>(null);
  const [slotHint, setSlotHint] = React.useState<SlotHint>("idle");
  // The result placard pops up over the page when the reels land; it can be
  // closed and reopened from the line under the machine.
  const [resultOpen, setResultOpen] = React.useState(false);

  React.useEffect(() => {
    getSpinsRemaining().then(setSpinsLeft);
  }, []);

  // Deal out today's coins once the spin count is known. (State adjusted
  // during render, per React's guidance, rather than in an effect.)
  if (coins === null && spinsLeft !== null) {
    setCoins(Array.from({ length: Math.min(spinsLeft, DAILY_SPINS) }, (_, i) => i));
  }

  const pool = source === "deck" ? deckMovies : catalog;
  const poolLabel = source === "deck" ? "Your Watch Deck" : "The Whole Catalogue";
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
    if (spinning || blockedReason || !credited) return;
    setSpinning(true);
    setCredited(false); // the coin is spent
    setInsertedCoin(null);
    setResult(null);
    setLanded(0);
    // The lever goes all the way down (from wherever a pull left it), then
    // swings back up.
    animate(leverTheta, [leverTheta.get(), 180, 180, 0], {
      duration: 1.3,
      times: [0, 0.2, 0.35, 1],
      ease: ["easeIn", "linear", "easeOut"],
    });

    // Re-check against the server right before spinning, in case another tab
    // used up today's spins.
    if (isSupabaseConfigured) {
      const remaining = await getSpinsRemaining();
      if (remaining <= 0) {
        setSpinsLeft(0);
        setCoins([]);
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
    setResultOpen(true);
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

  const canSpin = !spinning && blockedReason === null && credited;
  const canInsert = !spinning && blockedReason === null && !credited;

  const insertCoin = (id: number) => {
    setCoins((prev) => (prev ?? []).filter((c) => c !== id));
    setInsertedCoin(id);
    setCredited(true);
  };

  // Coin Return: take the coin back out before pulling the lever.
  const returnCoin = () => {
    if (!credited || spinning || insertedCoin === null) return;
    const id = insertedCoin;
    setCoins((prev) => [...(prev ?? []), id].sort((a, b) => a - b));
    setInsertedCoin(null);
    setCredited(false);
  };

  return (
    // The casino floor: on laptops and up, three columns — the wager board,
    // the machine dead centre, and the coin tray with the play status — so
    // the whole game fits one screen. On phones they stack: board, coins,
    // machine.
    <div className="flex flex-col items-center gap-4">
      <div className="grid w-full items-center gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
        {/* The wager board: what the reels will draw from, set out plainly
            before any coin goes in, so nobody spends one on the wrong pool.
            The first of the three steps. */}
        <section
          aria-labelledby="wager-heading"
          className="broadside order-1 w-full max-w-xl justify-self-center px-4 py-3 text-center lg:max-w-[240px] lg:justify-self-end"
        >
          <p
            id="wager-heading"
            className="mb-1 flex items-center justify-center gap-1.5 font-slab text-[9px] tracking-[0.3em] text-crimson uppercase"
          >
            <StepMark n={1} tone="paper" /> Place Your Wager · Spin For
          </p>
          <Ornament className="mb-2 text-ink" />
          <div role="radiogroup" aria-label="Spin for" className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
            <PoolTicket
              icon={Layers}
              title="Your Watch Deck"
              count={deckMovies.length}
              selected={source === "deck"}
              disabled={spinning}
              onSelect={() => setSource("deck")}
            />
            <PoolTicket
              icon={Film}
              title="The Whole Catalogue"
              count={catalog.length}
              selected={source === "catalog"}
              disabled={spinning}
              onSelect={() => setSource("catalog")}
            />
          </div>
          <div className="mt-3">
            <FilterBar
              genres={genres}
              value={filters}
              onChange={setFilters}
              disabled={spinning}
              tone="paper"
            />
          </div>
          <p className="mt-2 font-serif text-xs" aria-live="polite">
            The reels hold{" "}
            <strong className="font-bold text-crimson">
              {filtered.length} {filtered.length === 1 ? "picture" : "pictures"}
            </strong>{" "}
            · {poolLabel}
            {filters.genres.length > 0 &&
              ` · ${filters.genres.map((g) => GENRE_META[g].label).join(", ")}`}
          </p>
        </section>

        {/* The machine, dead centre. The lever hangs off its right edge; on
            phones the side padding makes room for it. */}
        <div className="order-3 mx-auto w-full max-w-[340px] max-sm:px-10 lg:order-2 lg:w-[340px] lg:max-w-none">
          <div className="relative">
            {/* Gold trim around the cabinet */}
            <div
              className="rounded-[28px] p-[3px] shadow-2xl shadow-black/60"
              style={{
                background: "linear-gradient(160deg, #f6dc8c, #a7791c 35%, #f6dc8c 55%, #8a6417)",
              }}
            >
              <div className="rounded-[25px] bg-gradient-to-b from-[#2c2c33] to-[#121215] p-2.5 sm:p-3">
                {/* Marquee */}
                <div className="mb-2.5 rounded-2xl bg-[#0b0b0e] px-4 py-1.5 text-center">
                  <Bulbs spinning={spinning} won={result !== null} />
                  <p className="mt-1 font-woodtype text-2xl leading-none tracking-[0.3em] text-[#f6dc8c] [text-shadow:0_0_12px_rgba(246,220,140,0.55)]">
                    SPIN
                  </p>
                  {/* What this pull draws from, right where you pull */}
                  <p className="mt-1 mb-1 truncate font-mono text-[10px] font-bold tracking-[0.15em] text-amber-400 uppercase [text-shadow:0_0_6px_rgba(251,191,36,0.7)]">
                    {source === "deck" ? "Watch Deck" : "Whole Catalogue"} · {filtered.length}
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

                {/* The control panel: a recessed strip holding three matching
                    modules — same height, corners, and brass bezel: the spin
                    counter, the coin slot, and the Spin button. */}
                <div className="mt-2.5 grid grid-cols-[3.25rem_3.25rem_minmax(0,1fr)] gap-1.5 rounded-xl bg-black/45 p-1.5 shadow-[inset_0_2px_6px_rgb(0_0_0/0.8)]">
                  <div className="flex h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md bg-black ring-1 ring-[#8a6417] ring-inset">
                    <span className="font-slab text-[6px] leading-none tracking-[0.15em] text-[#8a8a92] uppercase">
                      Spins
                    </span>
                    <span className="font-mono text-xl leading-none font-bold text-amber-400 [text-shadow:0_0_8px_rgba(251,191,36,0.7)]">
                      {spinsLeft ?? "–"}
                    </span>
                  </div>
                  <CoinSlot
                    ref={slotRef}
                    credited={credited}
                    hint={slotHint}
                    canReturn={!spinning}
                    onReturn={returnCoin}
                    className="h-[3.25rem] w-auto"
                  />
                  {/* Always just "Spin" (greyed out until a coin is in: the
                      glowing slot and step ② say what's needed). */}
                  <Button
                    className="h-[3.25rem] min-w-0 gap-1.5 rounded-md px-3 text-xs ring-1 ring-[#8a6417] ring-inset"
                    disabled={!canSpin}
                    onClick={spin}
                    title={credited ? undefined : "Insert a coin first"}
                  >
                    {!spinning && <Dices className="size-4" />}
                    {spinning ? "Spinning…" : "Spin"}
                  </Button>
                </div>
              </div>
            </div>

            <Lever theta={leverTheta} enabled={canSpin} onPull={spin} />
          </div>
        </div>

        {/* The coin tray and how play stands. Layered over the machine so a
            coin flies in front of it on its way to the slot. */}
        <div className="relative z-30 order-2 flex flex-col items-center gap-2 text-center lg:order-3 lg:justify-self-start lg:pl-14">
          <FloatingCoins
            coins={coins ?? []}
            enabled={canInsert}
            slotRef={slotRef}
            onInsert={insertCoin}
            onHint={setSlotHint}
          />
          <p className="font-slab text-[9px] tracking-[0.2em] text-gold-light/80 uppercase">
            {spinsLeft === null
              ? "Three Spins Per Day"
              : spinsLeft === 0
                ? "No Spins Remain Tonight"
                : `${spinsLeft} ${spinsLeft === 1 ? "Spin Remains" : "Spins Remain"} Tonight`}
          </p>
          {blockedReason && !spinning ? (
            <p role="status" className="max-w-[220px] font-serif text-sm text-paper/80 italic">
              {blockedReason}
            </p>
          ) : (
            // The remaining steps; the current one is lit, finished ones dim.
            <ol className="flex flex-col gap-1.5 text-left" aria-label="How to spin">
              <Step n={2} state={credited || spinning ? "done" : "now"}>
                Drop a coin in the slot
              </Step>
              <Step n={3} state={spinning ? "done" : credited ? "now" : "next"}>
                Pull the lever all the way down
              </Step>
            </ol>
          )}
          {credited && !spinning && (
            <button
              type="button"
              onClick={returnCoin}
              className="font-slab text-[9px] tracking-[0.2em] text-gold-light/80 uppercase underline-offset-4 hover:text-gold-light hover:underline"
            >
              ↩ Coin Return
            </button>
          )}
          {result && !spinning && !resultOpen && (
            <button
              type="button"
              onClick={() => setResultOpen(true)}
              className="max-w-[220px] font-slab text-[9px] tracking-[0.2em] text-gold-light/80 uppercase underline-offset-4 hover:text-gold-light hover:underline"
            >
              ✦ Your Pick: {result.title} ✦
            </button>
          )}
        </div>
      </div>

      <Dialog open={resultOpen && result !== null} onOpenChange={setResultOpen}>
        {/* A bare frame around the card and placard, so the dialog's own
            card styling doesn't fight the paper. */}
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto border-0 bg-transparent p-3 text-ink shadow-none">
          {result && (
            <motion.div
              key={`${result.id}-${spinsLeft}`}
              className="flex flex-col items-center gap-5 sm:flex-row sm:items-start"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <DialogTitle className="sr-only">Your pick: {result.title}</DialogTitle>
              <DialogDescription className="sr-only">The reels landed on {result.title}.</DialogDescription>
              <motion.div
                className="w-[160px] shrink-0"
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <MovieCard movie={result} className="shadow-2xl shadow-black/60" />
              </motion.div>
              <div className="broadside w-full px-5 py-4">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

// A small circled step number (①②③).
function StepMark({ n, tone = "velvet" }: { n: number; tone?: "velvet" | "paper" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full border font-slab text-[8px] leading-none tracking-normal",
        tone === "paper" ? "border-crimson text-crimson" : "border-current"
      )}
    >
      {n}
    </span>
  );
}

// One step of play in the right-hand column: lit gold when it's the step
// to take now, dimmed with a check once done.
function Step({
  n,
  state,
  children,
}: {
  n: number;
  state: "done" | "now" | "next";
  children: React.ReactNode;
}) {
  return (
    <li
      aria-current={state === "now" ? "step" : undefined}
      className={cn(
        "flex items-center gap-2 font-serif text-sm transition-colors duration-300",
        state === "now" && "text-gold-light",
        state === "next" && "text-paper/55",
        state === "done" && "text-paper/40 line-through decoration-paper/30"
      )}
    >
      {state === "done" ? (
        <span aria-hidden className="inline-flex size-4 items-center justify-center rounded-full bg-gold/30 text-paper">
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      ) : (
        <StepMark n={n} />
      )}
      <span className="sr-only">Step {n}: </span>
      {children}
    </li>
  );
}

// One of the two pools on the wager board, as a big printed ticket. The
// chosen one is raised, framed in crimson, and stamped with a check.
function PoolTicket({
  icon: Icon,
  title,
  count,
  selected,
  disabled,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "relative flex items-center gap-3 rounded-[4px] border-2 px-3 py-2.5 text-left transition-[transform,box-shadow,background-color,opacity] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-crimson disabled:cursor-not-allowed",
        selected
          ? "-translate-y-0.5 border-double border-crimson bg-[#fff8e6] shadow-[0_6px_14px_rgb(0_0_0/0.25)]"
          : "border-ink/25 bg-transparent opacity-60 hover:opacity-90"
      )}
    >
      <Icon className={cn("size-6 shrink-0", selected ? "text-crimson" : "text-ink/60")} strokeWidth={1.75} />
      <span className="min-w-0">
        <span className="block font-display text-sm leading-tight uppercase sm:text-base">{title}</span>
        <span className="block font-slab text-[8px] tracking-[0.18em] text-ink/70 uppercase">
          {count} {count === 1 ? "Picture" : "Pictures"}
        </span>
      </span>
      {selected && (
        <span
          aria-hidden
          className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-paper bg-crimson text-paper shadow-md"
        >
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
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
      <Icon className="size-6 shrink-0" style={{ color: meta.color }} strokeWidth={1.75} />
      <p className="line-clamp-2 font-display text-[10px] leading-tight text-[#1c1b19] sm:text-[11px]">
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
