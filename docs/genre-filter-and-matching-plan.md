# Reel Roulette: Genre filter — OR to AND matching

## Context

Picking multiple genres in the filter bar (swipe deck or Spin) currently
shows movies with *any* of the selected tags. The goal is precise combo
discovery instead — picking Sci-Fi + Horror should find movies that are
genuinely both (Alien, The Thing), not just all sci-fi plus all horror.

## Diagnosis

`src/lib/movie-filters.ts`'s `applyFilters` is shared by the swipe deck
and Spin (via `FilterBar` in `filter-bar.tsx`), and currently ORs:

```js
// Genres are OR'd: picking Action + Romance means "has either tag".
export function applyFilters(movies: Movie[], f: FilterState): Movie[] {
  if (f.genres.length === 0) return movies;
  return movies.filter((m) => m.genre_slugs.some((g) => f.genres.includes(g)));
}
```

Current catalog movies average 1.8 genre tags each (max 2), so
AND-matching with 2+ genres selected will often narrow hard today —
expected, and improves once the IMDb import (see
`docs/imdb-catalog-import-plan.md`) lands more generously-tagged movies.

## Fix

Change `.some()` to `.every()` so a movie must carry *all* selected
genres:

```js
// Genres are AND'd: picking Action + Romance means "has both tags".
export function applyFilters(movies: Movie[], f: FilterState): Movie[] {
  if (f.genres.length === 0) return movies;
  return movies.filter((m) => f.genres.every((g) => m.genre_slugs.includes(g)));
}
```

Single-genre selection is unaffected either way — this only changes
behavior once 2+ genres are active. No other files need to change;
both the swipe deck and Spin pick up the new behavior automatically
since they share this function.

## Files to touch

- `src/lib/movie-filters.ts` — the one-line logic change + updated comment.

## Verification

1. On the current catalog, select Horror + Sci-Fi: confirm only Alien
   (the one movie tagged both) is returned, not every horror or scifi
   movie.
2. Select a 3-genre combination with no overlap today (e.g. Horror +
   Romance + Animation): confirm the existing empty-pool UI handles it
   gracefully, same as an over-narrow OR filter does today.
3. Select just one genre: confirm behavior is unchanged from before.
