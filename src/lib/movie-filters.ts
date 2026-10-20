import type { GenreSlug, Movie } from "@/lib/types";

// The genre filter used everywhere a pool of movies gets narrowed down: the
// swipe deck and the Spin slot machine.

export type FilterState = {
  genres: GenreSlug[];
};

export const EMPTY_FILTERS: FilterState = { genres: [] };

export function hasActiveFilters(f: FilterState): boolean {
  return f.genres.length > 0;
}

// Genres are AND'd: picking Action + Romance means "has both tags". With two
// or more picked, the picture's own suit (primary genre) must also be one of
// them, since imported tags are generous: Horror + Sci-Fi shouldn't turn up
// an Action picture or a cartoon that merely carries both tags.
export function applyFilters(movies: Movie[], f: FilterState): Movie[] {
  if (f.genres.length === 0) return movies;
  return movies.filter(
    (m) =>
      f.genres.every((g) => m.genre_slugs.includes(g)) &&
      (f.genres.length === 1 || f.genres.includes(m.primary_genre))
  );
}
