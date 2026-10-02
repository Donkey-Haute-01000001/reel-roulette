import { getMovies } from "@/lib/data";
import { WatchDeckScreen } from "@/components/watch-deck-screen";

export const dynamic = "force-dynamic";

// Route stays /watchlist; the user-facing name is now "Watch Deck".
// `?play=<movieId>` opens the page with that card already on the table.
export default async function WatchDeckPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ play }, catalog] = await Promise.all([searchParams, getMovies()]);
  const playId = typeof play === "string" && /^\d+$/.test(play) ? Number(play) : null;

  // The full catalog is what Hit me deals from (pictures not yet saved).
  return <WatchDeckScreen key={playId ?? "none"} catalog={catalog} initialPlayId={playId} />;
}
