import { getGenres, getMovies } from "@/lib/data";
import { RouletteScreen } from "@/components/roulette-screen";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [movies, genres] = await Promise.all([getMovies(), getGenres()]);

  return (
    <div>
      {!isSupabaseConfigured && (
        <p className="mx-auto mt-6 max-w-xl rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-sm text-muted-foreground">
          Connect a Supabase project and set <code>NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to load the movie pool.
        </p>
      )}
      <RouletteScreen movies={movies} genres={genres} />
    </div>
  );
}
