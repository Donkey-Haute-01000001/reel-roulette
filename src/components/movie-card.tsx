import { Clock, Star, User } from "lucide-react";

import type { Movie } from "@/lib/types";
import { GENRE_META } from "@/lib/genre-meta";
import { Badge } from "@/components/ui/badge";
import { MoviePoster } from "@/components/movie-poster";
import { cn } from "@/lib/utils";

// Each movie is drawn as a playing card. The primary genre is the card's
// "suit" (10 suits — one per genre in GENRE_META), shown as corner pips
// top-left and mirrored bottom-right like a real card's index.
//
// `compact` is the smaller layout used in the Watch Deck fan and grid.
export function MovieCard({
  movie,
  size = "default",
  className,
}: {
  movie: Movie;
  size?: "default" | "compact";
  className?: string;
}) {
  const meta = GENRE_META[movie.primary_genre];
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col rounded-[22px] border border-border bg-card p-2 select-none",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(160deg, color-mix(in srgb, ${meta.color} 14%, transparent), transparent 45%)`,
      }}
    >
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[15px] border bg-card"
        style={{ borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)` }}
      >
        <CornerPip movie={movie} className="absolute top-2 left-2 z-10" />

        <MoviePoster
          genre={movie.primary_genre}
          title={movie.title}
          year={movie.release_year}
          className={cn("shrink-0 rounded-none", compact ? "h-40" : "h-52 sm:h-60")}
        />

        <div className={cn("flex flex-1 flex-col overflow-y-auto", compact ? "gap-2 p-3.5" : "gap-3 p-5")}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge style={{ background: meta.color, color: "#0a0a0c", borderColor: "transparent" }}>
              {meta.label}
            </Badge>
            {movie.genre_slugs
              .filter((g) => g !== movie.primary_genre)
              .slice(0, compact ? 1 : 2)
              .map((g) => (
                <Badge key={g} variant="outline">
                  {GENRE_META[g]?.label ?? g}
                </Badge>
              ))}
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-foreground">
              <Star className="size-4 fill-current text-primary" />
              {movie.rating.toFixed(1)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" /> {movie.director}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {movie.runtime_minutes} min
            </span>
          </div>

          <p
            className={cn(
              "text-sm leading-relaxed text-foreground/90",
              compact && "line-clamp-3 text-[13px] leading-snug"
            )}
          >
            {movie.synopsis}
          </p>

          {!compact && movie.mood_tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {movie.mood_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground/80"
                >
                  #{tag.replace(/-/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex h-9 shrink-0 items-center justify-end px-2">
          <CornerPip movie={movie} className="rotate-180" />
        </div>
      </div>
    </div>
  );
}

// A card's corner index. Suit only for now — the empty `rank` slot sits
// above the suit, where a rating-as-rank glyph can drop in later without
// reworking the corner.
function CornerPip({ movie, className }: { movie: Movie; className?: string }) {
  const meta = GENRE_META[movie.primary_genre];
  const Icon = meta.icon;

  return (
    <div
      aria-hidden
      className={cn(
        "flex flex-col items-center rounded-md bg-black/45 px-1 py-1 leading-none backdrop-blur-sm",
        className
      )}
    >
      <span data-slot="rank" className="font-display text-sm font-black empty:hidden" />
      <Icon className="size-4" style={{ color: meta.color }} strokeWidth={2.25} />
    </div>
  );
}
