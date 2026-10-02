"use client";

import * as React from "react";
import { motion, useMotionValue } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Movie } from "@/lib/types";
import { MovieCard } from "@/components/movie-card";
import { Button } from "@/components/ui/button";

const CARD_W = 250;
const CARD_H = 390;
const SPREAD = 58; // horizontal px between neighbouring cards
const TILT = 6; // degrees of rotation per card away from the focus
const VISIBLE = 4; // cards shown on each side of the focused one
const DRAG_THRESHOLD = 60;

// The Watch Deck shown as a hand of cards: an overlapping arc, rotation
// increasing toward the ends, the focused card lifted forward. Each drag
// gesture moves the focus exactly one card (snap, not free scroll).
export function WatchDeckFan({
  movies,
  focusIndex,
  onFocusChange,
  highlightKey,
}: {
  movies: Movie[];
  focusIndex: number;
  onFocusChange: (index: number) => void;
  // Bumped by Hit Me / Pick a Card so the drawn card flashes on reveal.
  highlightKey: number;
}) {
  const x = useMotionValue(0);
  // Set once a drag starts so the click that ends it doesn't also count as
  // "focus the card under the pointer".
  const draggedRef = React.useRef(false);

  const step = (delta: number) => {
    const next = Math.min(movies.length - 1, Math.max(0, focusIndex + delta));
    if (next !== focusIndex) onFocusChange(next);
  };

  const focused = movies[focusIndex];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full overflow-hidden" style={{ height: CARD_H + 90 }}>
        <motion.div
          role="listbox"
          aria-label="Watch Deck"
          aria-activedescendant={focused ? `fan-card-${focused.id}` : undefined}
          tabIndex={0}
          className="absolute inset-0 cursor-grab rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onPointerDown={() => {
            draggedRef.current = false;
          }}
          onDragStart={() => {
            draggedRef.current = true;
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -DRAG_THRESHOLD || info.velocity.x < -500) step(1);
            else if (info.offset.x > DRAG_THRESHOLD || info.velocity.x > 500) step(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            else if (e.key === "ArrowLeft") step(-1);
          }}
        >
          {movies.map((movie, i) => {
            const d = i - focusIndex;
            if (Math.abs(d) > VISIBLE + 1) return null;
            const isFocused = d === 0;
            const hidden = Math.abs(d) > VISIBLE;

            return (
              <motion.div
                key={movie.id}
                id={`fan-card-${movie.id}`}
                role="option"
                aria-selected={isFocused}
                aria-label={movie.title}
                className="absolute top-10"
                style={{
                  left: "50%",
                  marginLeft: -CARD_W / 2,
                  width: CARD_W,
                  height: CARD_H,
                  transformOrigin: "50% 110%",
                  zIndex: 100 - Math.abs(d),
                  pointerEvents: hidden ? "none" : "auto",
                }}
                initial={false}
                animate={{
                  x: d * SPREAD,
                  y: isFocused ? -18 : d * d * 5,
                  rotate: d * TILT,
                  scale: isFocused ? 1.04 : 0.92,
                  opacity: hidden ? 0 : 1,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                onClick={() => {
                  if (!draggedRef.current && !isFocused) onFocusChange(i);
                }}
              >
                <MovieCard
                  movie={movie}
                  size="compact"
                  className={isFocused ? "shadow-2xl" : "shadow-lg brightness-[0.8]"}
                />
                {isFocused && highlightKey > 0 && (
                  <motion.div
                    key={highlightKey}
                    aria-hidden
                    className="pointer-events-none absolute -inset-1 rounded-[26px] ring-4 ring-primary"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: [0, 1, 1, 0], scale: [0.96, 1.02, 1.02, 1] }}
                    transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1] }}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="mt-2 flex w-full max-w-sm items-center justify-between gap-3">
        <Button
          size="icon"
          variant="outline"
          aria-label="Previous card"
          disabled={focusIndex <= 0}
          onClick={() => step(-1)}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate font-display text-base font-bold">{focused?.title}</p>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Card {focusIndex + 1} of {movies.length} · drag to flip
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          aria-label="Next card"
          disabled={focusIndex >= movies.length - 1}
          onClick={() => step(1)}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
