import * as React from "react";
import { Clock, Star, type LucideIcon } from "lucide-react";

import type { Movie } from "@/lib/types";
import { GENRE_META } from "@/lib/genre-meta";
import { cardRank } from "@/lib/card-rank";
import { cn } from "@/lib/utils";

// Each movie is a playing card in the manner of an old (c. 1930) deck:
// linen-finish cream stock, a thin ink frame inset from the edge, the corner
// indices (rank over suit) in the margins outside it, a large suit pip in the
// frame's top-right corner mirrored bottom-left, and an ace-style rosette
// medallion around the suit. The primary genre is the suit (10 suits, one per
// genre in GENRE_META); the rank comes from the rating (see card-rank.ts).
//
// Everything inside is sized in container units (cqw = 1% of the card's
// width), so the card is only given a width and scales as one piece. The
// outer div is the size container; cqw on the face itself would resolve
// against the *page*, not the card, so the face lives one level down.
// Memoised: the Watch Deck hand re-renders on every hover change, but a
// card's face only depends on its movie.
export const MovieCard = React.memo(function MovieCard({
  movie,
  className,
}: {
  movie: Movie;
  className?: string;
}) {
  const meta = GENRE_META[movie.primary_genre];
  const { rank } = cardRank(movie.rating);
  // Genre colours are tuned for a dark page; darken them for print on cream.
  const ink = `color-mix(in srgb, ${meta.color} 70%, #000)`;
  const pip = `color-mix(in srgb, ${meta.color} 85%, #000)`;

  return (
    <div className="@container w-full select-none">
      <div
        className={cn(
          "card-stock relative aspect-[5/7] w-full overflow-hidden rounded-[6cqw] border border-[#d3c39f] text-[#1c1b19]",
          className
        )}
      >
        <CornerIndex rank={rank} icon={meta.icon} color={ink} className="top-[4cqw] left-[1.5cqw]" />
        <CornerIndex
          rank={rank}
          icon={meta.icon}
          color={ink}
          className="right-[1.5cqw] bottom-[4cqw] rotate-180"
        />

        {/* The printed frame, with the large pips in its corners */}
        <div className="absolute inset-x-[12.5cqw] inset-y-[5cqw] rounded-[1cqw] border-[max(1px,0.45cqw)] border-[#1c1b19]/75">
          <meta.icon
            aria-hidden
            className="absolute top-[2.5cqw] right-[2.5cqw] size-[10cqw]"
            style={{ color: pip }}
            strokeWidth={2.25}
          />
          <meta.icon
            aria-hidden
            className="absolute bottom-[2.5cqw] left-[2.5cqw] size-[10cqw] rotate-180"
            style={{ color: pip }}
            strokeWidth={2.25}
          />

          <div className="flex h-full flex-col items-center px-[3cqw] pt-[4cqw] pb-[5cqw] text-center">
            <p
              className="w-full truncate px-[11cqw] font-slab text-[4cqw] leading-[6cqw] tracking-[0.1em] uppercase"
              style={{ color: ink }}
            >
              {meta.label}
            </p>

            <div className="flex min-h-0 w-full flex-1 items-center justify-center py-[1cqw]">
              <Medallion icon={meta.icon} color={meta.color} />
            </div>

            <p className="line-clamp-3 w-full px-[1cqw] font-display text-[6.8cqw] leading-[1.12] text-balance">
              {movie.title}
            </p>
            <p className="mt-[1.5cqw] inline-flex items-center gap-[3cqw] font-serif text-[4.8cqw] font-bold text-[#6b6457]">
              <span className="inline-flex items-center gap-[1cqw]">
                <Clock className="size-[4.4cqw]" />
                {movie.runtime_minutes} min
              </span>
              <span className="inline-flex items-center gap-[1cqw]">
                <Star className="size-[4.4cqw] fill-[#e0a400] text-[#e0a400]" />
                {movie.rating.toFixed(1)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

// A card's corner index: rank over suit, printed in the margin.
function CornerIndex({
  rank,
  icon: Icon,
  color,
  className,
}: {
  rank: string;
  icon: LucideIcon;
  color: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("absolute flex w-[10cqw] flex-col items-center leading-none", className)}
      style={{ color }}
    >
      <span
        className={cn(
          "font-serif font-bold tracking-[-0.06em]",
          rank.length > 1 ? "text-[6.5cqw]" : "text-[8cqw]"
        )}
      >
        {rank}
      </span>
      <Icon className="mt-[0.8cqw] size-[6.5cqw]" strokeWidth={2.5} />
    </div>
  );
}

// The ace-style rosette: a ring of petals and beads around the suit.
const PETALS = Array.from({ length: 16 }, (_, i) => i * 22.5);
const BEADS = Array.from({ length: 32 }, (_, i) => (i * Math.PI * 2) / 32);

function Medallion({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  const deep = `color-mix(in srgb, ${color} 60%, #000)`;

  return (
    <div className="relative aspect-square h-full max-h-[46cqw] max-w-full">
      <svg aria-hidden viewBox="-50 -50 100 100" className="absolute inset-0 h-full w-full">
        {PETALS.map((angle, i) => (
          <ellipse
            key={angle}
            cx="0"
            cy="-35"
            rx="4.2"
            ry="10.5"
            transform={`rotate(${angle})`}
            fill={i % 2 === 0 ? color : deep}
            fillOpacity={i % 2 === 0 ? 0.55 : 0.4}
            stroke={deep}
            strokeOpacity="0.5"
            strokeWidth="0.6"
          />
        ))}
        {BEADS.map((a) => (
          <circle key={a} cx={Math.cos(a) * 47} cy={Math.sin(a) * 47} r="1.1" fill={deep} fillOpacity="0.55" />
        ))}
        <circle r="25" fill="#f6eedb" stroke={deep} strokeWidth="1.4" />
        <circle r="21.5" fill="none" stroke={deep} strokeOpacity="0.45" strokeWidth="0.8" strokeDasharray="1.6 1.6" />
      </svg>
      <Icon
        className="absolute top-1/2 left-1/2 size-[30%] -translate-x-1/2 -translate-y-1/2"
        style={{ color }}
        strokeWidth={1.8}
      />
    </div>
  );
}
