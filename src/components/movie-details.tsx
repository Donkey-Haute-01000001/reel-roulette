import { Clock, Star, User } from "lucide-react";

import type { Movie } from "@/lib/types";
import { GENRE_META } from "@/lib/genre-meta";
import { cardRank } from "@/lib/card-rank";
import { Ornament } from "@/components/broadside";
import { cn } from "@/lib/utils";

// The text that doesn't fit on a card face, set as a small broadside
// placard: shown beside a card played to the table, or one the reels picked.
// Printed in ink on cream, so it expects to sit inside a `.broadside` panel.
export function MovieDetails({
  movie,
  kicker = "Now Showing",
  className,
}: {
  movie: Movie;
  kicker?: string;
  className?: string;
}) {
  const meta = GENRE_META[movie.primary_genre];
  const others = movie.genre_slugs.filter((g) => g !== movie.primary_genre);
  const { name: rankName } = cardRank(movie.rating);

  return (
    <div className={cn("flex flex-col gap-2 text-center text-ink", className)}>
      <p className="font-slab text-[9px] tracking-[0.3em] text-crimson uppercase">{kicker}</p>
      <h3 className="text-2xl leading-tight text-balance uppercase sm:text-[1.7rem]">
        {movie.title}
      </h3>
      <p className="font-woodtype text-sm tracking-wide">
        The {rankName} of {meta.label}
      </p>
      <p className="-mt-1 font-serif text-xs italic">
        {[String(movie.release_year), ...others.map((g) => GENRE_META[g]?.label ?? g)].join(" · ")}
      </p>

      <Ornament className="text-ink" />

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-serif text-xs">
        <span className="inline-flex items-center gap-1">
          <User className="size-3.5" /> Directed by {movie.director}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {movie.runtime_minutes} minutes
        </span>
        <span className="inline-flex items-center gap-1 font-bold">
          <Star className="size-3.5 fill-[#e0a400] text-[#e0a400]" /> {movie.rating.toFixed(1)}
        </span>
      </div>

      <p className="font-serif text-sm leading-relaxed">{movie.synopsis}</p>

      {movie.mood_tags.length > 0 && (
        <p className="font-serif text-xs italic" style={{ color: `color-mix(in srgb, ${meta.color} 60%, #000)` }}>
          {movie.mood_tags.map((tag) => tag.replace(/-/g, " ")).join(" ❧ ")}
        </p>
      )}
    </div>
  );
}
