"use client";

import * as React from "react";

import type { Genre, GenreSlug } from "@/lib/types";
import { GENRE_META } from "@/lib/genre-meta";
import { EMPTY_FILTERS, hasActiveFilters, type FilterState } from "@/lib/movie-filters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FilterBar({
  genres,
  value,
  onChange,
  disabled = false,
  children,
}: {
  genres: Genre[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const toggleGenre = (slug: GenreSlug) => {
    onChange({
      ...value,
      genres: value.genres.includes(slug)
        ? value.genres.filter((g) => g !== slug)
        : [...value.genres, slug],
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-1.5">
        {genres.map((g) => {
          const meta = GENRE_META[g.slug];
          const active = value.genres.includes(g.slug);
          return (
            <button
              key={g.slug}
              disabled={disabled}
              onClick={() => toggleGenre(g.slug)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1 font-slab text-[9px] tracking-[0.12em] uppercase transition-colors disabled:opacity-50",
                active
                  ? "border-ink text-ink shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]"
                  : "border-gold/40 bg-black/25 text-paper/80 hover:border-gold hover:text-paper"
              )}
              style={active ? { background: meta.color } : undefined}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {hasActiveFilters(value) && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Clear Filters
          </Button>
        )}

        {children}
      </div>
    </div>
  );
}
