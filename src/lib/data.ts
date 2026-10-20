import "server-only";

import { supabase } from "@/lib/supabase";
import type { Genre, Movie } from "@/lib/types";

// Degrades to an empty result when Supabase isn't configured yet, so the
// app still builds and renders (with an empty state) beforehand.

// Supabase hands back at most 1,000 rows per request, so the catalogue is
// fetched a page at a time.
const PAGE = 1000;

export async function getMovies(): Promise<Movie[]> {
  if (!supabase) return [];
  const movies: Movie[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("movies_with_genres")
      .select("*")
      .order("title")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("getMovies failed:", error.message);
      return [];
    }
    movies.push(...((data ?? []) as Movie[]));
    if (!data || data.length < PAGE) return movies;
  }
}

export async function getGenres(): Promise<Genre[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("genres").select("*").order("name");
  if (error) {
    console.error("getGenres failed:", error.message);
    return [];
  }
  return data ?? [];
}
