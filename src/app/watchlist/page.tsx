import { getGenres, getMovies } from "@/lib/data";
import { WatchDeckScreen } from "@/components/watch-deck-screen";

export const dynamic = "force-dynamic";

// Route stays /watchlist; the user-facing name is now "Watch Deck".
export default async function WatchDeckPage() {
  // The full catalog is needed for the Roulette's "whole catalog" pool.
  const [movies, genres] = await Promise.all([getMovies(), getGenres()]);

  return <WatchDeckScreen catalog={movies} genres={genres} />;
}
