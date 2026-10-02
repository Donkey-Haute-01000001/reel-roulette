"use client";

import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";

// Pictures this visitor has swiped left on ("already seen"). The Swipe deck
// leaves them out until they're shuffled back in.

export async function fetchSeenIds(): Promise<Set<number>> {
  if (!supabase) return new Set();
  const { data, error } = await supabase
    .from("seen_movies")
    .select("movie_id")
    .eq("session_id", getSessionId());
  if (error) {
    console.error("fetchSeenIds failed:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.movie_id as number));
}

export async function markSeen(movieId: number): Promise<boolean> {
  if (!supabase) return false;
  // ON CONFLICT DO NOTHING — there's deliberately no update policy.
  const { error } = await supabase
    .from("seen_movies")
    .upsert(
      { session_id: getSessionId(), movie_id: movieId },
      { onConflict: "session_id,movie_id", ignoreDuplicates: true }
    );
  if (error) {
    console.error("markSeen failed:", error.message);
    return false;
  }
  return true;
}

export async function clearSeen(): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("seen_movies").delete().eq("session_id", getSessionId());
  if (error) {
    console.error("clearSeen failed:", error.message);
    return false;
  }
  return true;
}
