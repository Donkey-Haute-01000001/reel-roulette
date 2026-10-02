"use client";

import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";

export const DAILY_SPINS = 3;

// Today's date as Postgres stores it (Supabase runs in UTC), so reads and
// writes always key the same row. The limit therefore resets at UTC midnight.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function readSpinCount(): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from("roulette_spins")
    .select("spin_count")
    .eq("session_id", getSessionId())
    .eq("spin_date", today())
    .maybeSingle();
  if (error) {
    console.error("readSpinCount failed:", error.message);
    return 0;
  }
  return data?.spin_count ?? 0;
}

export async function getSpinsRemaining(): Promise<number> {
  return Math.max(0, DAILY_SPINS - (await readSpinCount()));
}

// Plain read-then-write increment. Returns the spins left after this one, or
// null when Supabase isn't configured / the write failed, so the caller can
// fall back to counting locally.
export async function recordSpin(): Promise<number | null> {
  if (!supabase) return null;
  const count = (await readSpinCount()) + 1;
  const { error } = await supabase
    .from("roulette_spins")
    .upsert(
      { session_id: getSessionId(), spin_date: today(), spin_count: count },
      { onConflict: "session_id,spin_date" }
    );
  if (error) {
    console.error("recordSpin failed:", error.message);
    return null;
  }
  return Math.max(0, DAILY_SPINS - count);
}
