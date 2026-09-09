import { GENRE_META } from "@/lib/genre-meta";
import type { GenreSlug } from "@/lib/types";
import { cn } from "@/lib/utils";

// No licensed poster art here — real movie posters are copyrighted studio
// assets. Instead every card gets an original, generated "lobby card" look:
// a genre-tinted gradient with a large watermark icon and the title card.
export function MoviePoster({
  genre,
  title,
  year,
  className,
}: {
  genre: GenreSlug;
  title: string;
  year: number;
  className?: string;
}) {
  const meta = GENRE_META[genre];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-t-2xl",
        className
      )}
      style={{
        background: `radial-gradient(120% 120% at 15% 0%, color-mix(in srgb, ${meta.color} 55%, #16171a) 0%, #16171a 70%)`,
      }}
    >
      <Icon
        className="absolute -bottom-6 -right-6 size-40 opacity-15"
        style={{ color: meta.color }}
        strokeWidth={1.25}
      />
      <Icon
        className="size-16 opacity-90 drop-shadow-lg"
        style={{ color: meta.color }}
        strokeWidth={1.5}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pt-10 pb-4 text-center">
        <p className="font-display text-2xl leading-tight font-black text-white text-balance">
          {title}
        </p>
        <p className="mt-1 text-sm font-semibold tracking-wide text-white/70">{year}</p>
      </div>
    </div>
  );
}
