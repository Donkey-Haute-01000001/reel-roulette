"use client";

import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";
import type { WatchlistEntry } from "@/lib/types";

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  if (!supabase) return [];
  const sessionId = getSessionId();
  const { data, error } = await supabase
    .from("watchlist")
    .select("*, movies:movie_id ( *, genre_slugs:movie_genres ( genre_slug ) )")
    .eq("session_id", sessionId)
    .order("saved_at", { ascending: false });
  if (error) {
    console.error("fetchWatchlist failed:", error.message);
    return [];
  }
  // Flatten the nested genre_slugs join shape to a plain string array.
  return (data ?? []).map((row) => ({
    ...row,
    movies: {
      ...row.movies,
      genre_slugs: Array.isArray(row.movies?.genre_slugs)
        ? row.movies.genre_slugs.map((g: { genre_slug: string }) => g.genre_slug)
        : [],
    },
  })) as WatchlistEntry[];
}

export async function addToWatchlist(movieId: number): Promise<boolean> {
  if (!supabase) return false;
  const sessionId = getSessionId();
  const { error } = await supabase
    .from("watchlist")
    .upsert({ session_id: sessionId, movie_id: movieId }, { onConflict: "session_id,movie_id" });
  if (error) {
    console.error("addToWatchlist failed:", error.message);
    return false;
  }
  return true;
}

export async function removeFromWatchlist(movieId: number): Promise<boolean> {
  if (!supabase) return false;
  const sessionId = getSessionId();
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("session_id", sessionId)
    .eq("movie_id", movieId);
  if (error) {
    console.error("removeFromWatchlist failed:", error.message);
    return false;
  }
  return true;
}
