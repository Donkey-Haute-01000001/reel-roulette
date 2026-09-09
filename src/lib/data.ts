import "server-only";

import { supabase } from "@/lib/supabase";
import type { Genre, Movie } from "@/lib/types";

// Degrades to an empty result when Supabase isn't configured yet, so the
// app still builds and renders (with an empty state) beforehand.

export async function getMovies(): Promise<Movie[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("movies_with_genres")
    .select("*")
    .order("title");
  if (error) {
    console.error("getMovies failed:", error.message);
    return [];
  }
  return (data ?? []) as Movie[];
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
