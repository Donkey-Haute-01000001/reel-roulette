"use client";

import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";

// Pictures this visitor has actually watched ("Seen It"). Not to be confused
// with seen-client.ts, which tracks swipe-left discards: this is a plain
// toggle the visitor can set and unset on any card.

export async function fetchWatchedIds(): Promise<Set<number>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("watched_movies")
    .select("movie_id")
    .eq("session_id", getSessionId());
  if (error) {
    console.error("fetchWatchedIds failed:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.movie_id as number));
}

export async function markWatched(movieId: number): Promise<boolean> {
  if (!supabase) return false;
  // ON CONFLICT DO NOTHING — there's deliberately no update policy.
  const { error } = await supabase
    .from("watched_movies")
    .upsert(
      { session_id: getSessionId(), movie_id: movieId },
      { onConflict: "session_id,movie_id", ignoreDuplicates: true }
    );
  if (error) {
    console.error("markWatched failed:", error.message);
    return false;
  }
  return true;
}

export async function unmarkWatched(movieId: number): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("watched_movies")
    .delete()
    .eq("session_id", getSessionId())
    .eq("movie_id", movieId);
  if (error) {
    console.error("unmarkWatched failed:", error.message);
    return false;
  }
  return true;
}

// Seen It as a toggle on a set of ids: flips the mark for this picture right
// away (so the turned-down corner shows at once) and records it in the
// background.
export function toggleWatchedIn(ids: Set<number>, movieId: number): Set<number> {
  const next = new Set(ids);
  if (next.has(movieId)) {
    next.delete(movieId);
    void unmarkWatched(movieId);
  } else {
    next.add(movieId);
    void markWatched(movieId);
  }
  return next;
}
