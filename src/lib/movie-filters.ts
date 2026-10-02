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

// Genres are OR'd: picking Action + Romance means "has either tag".
export function applyFilters(movies: Movie[], f: FilterState): Movie[] {
  if (f.genres.length === 0) return movies;
  return movies.filter((m) => m.genre_slugs.some((g) => f.genres.includes(g)));
}
