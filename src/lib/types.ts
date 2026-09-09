export type GenreSlug =
  | "action"
  | "comedy"
  | "drama"
  | "horror"
  | "scifi"
  | "romance"
  | "thriller"
  | "animation"
  | "fantasy"
  | "documentary";

export type Genre = {
  slug: GenreSlug;
  name: string;
};

export type Movie = {
  id: number;
  title: string;
  release_year: number;
  director: string;
  runtime_minutes: number;
  rating: number;
  primary_genre: GenreSlug;
  mood_tags: string[];
  synopsis: string;
  genre_slugs: GenreSlug[];
};

export type WatchlistEntry = {
  id: number;
  session_id: string;
  movie_id: number;
  saved_at: string;
  movies: Movie;
};

export type MovieFilters = {
  genres: GenreSlug[];
  decade: number | null;
  mood: string | null;
  maxRuntime: number | null;
};
