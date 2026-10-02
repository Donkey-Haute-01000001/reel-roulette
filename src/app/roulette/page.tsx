import { getGenres, getMovies } from "@/lib/data";
import { RouletteScreen } from "@/components/roulette-screen";

export const dynamic = "force-dynamic";

export default async function RoulettePage() {
  // The full catalog is needed for the "whole catalog" spin pool.
  const [movies, genres] = await Promise.all([getMovies(), getGenres()]);

  return <RouletteScreen catalog={movies} genres={genres} />;
}
