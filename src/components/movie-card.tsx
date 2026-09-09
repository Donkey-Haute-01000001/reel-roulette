import { Clock, Star, User } from "lucide-react";

import type { Movie } from "@/lib/types";
import { GENRE_META } from "@/lib/genre-meta";
import { Badge } from "@/components/ui/badge";
import { MoviePoster } from "@/components/movie-poster";
import { cn } from "@/lib/utils";

export function MovieCard({ movie, className }: { movie: Movie; className?: string }) {
  const meta = GENRE_META[movie.primary_genre];

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card select-none",
        className
      )}
    >
      <MoviePoster
        genre={movie.primary_genre}
        title={movie.title}
        year={movie.release_year}
        className="h-56 shrink-0 sm:h-64"
      />

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge style={{ background: meta.color, color: "#0a0a0c", borderColor: "transparent" }}>
            {meta.label}
          </Badge>
          {movie.genre_slugs
            .filter((g) => g !== movie.primary_genre)
            .slice(0, 2)
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

        <p className="text-sm leading-relaxed text-foreground/90">{movie.synopsis}</p>

        {movie.mood_tags.length > 0 && (
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
    </div>
  );
}
