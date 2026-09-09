"use client";

const STORAGE_KEY = "movie-roulette:session-id";

/**
 * A random, anonymous id stored in this browser's localStorage. There's no
 * login system here — it's just enough identity to let one visitor's
 * watchlist survive a page refresh, scoped only to their own browser.
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}
