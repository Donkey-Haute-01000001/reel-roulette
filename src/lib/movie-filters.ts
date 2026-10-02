import type { GenreSlug, Movie } from "@/lib/types";

// The genre / mood / runtime filter used everywhere a pool of movies gets
// narrowed down: the swipe deck, Pick a Card, and the Roulette slot machine.

export type FilterState = {
  genres: GenreSlug[];
  mood: string;
  maxRuntime: string;
};

export const EMPTY_FILTERS: FilterState = { genres: [], mood: "any", maxRuntime: "any" };

export const RUNTIME_OPTIONS = [
  { label: "Any length", value: "any" },
  { label: "Under 100 min", value: "100" },
  { label: "Under 130 min", value: "130" },
  { label: "Under 160 min", value: "160" },
];

export function hasActiveFilters(f: FilterState): boolean {
  return f.genres.length > 0 || f.mood !== "any" || f.maxRuntime !== "any";
}

// Genres are OR'd: picking Action + Romance means "has either tag".
export function applyFilters(movies: Movie[], f: FilterState): Movie[] {
  return movies.filter((m) => {
    const matchesGenre = f.genres.length === 0 || m.genre_slugs.some((g) => f.genres.includes(g));
    const matchesMood = f.mood === "any" || m.mood_tags.includes(f.mood);
    const matchesRuntime = f.maxRuntime === "any" || m.runtime_minutes <= Number(f.maxRuntime);
    return matchesGenre && matchesMood && matchesRuntime;
  });
}
