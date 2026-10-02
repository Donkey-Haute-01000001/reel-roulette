import { Ornament } from "@/components/broadside";

export function SiteFooter() {
  return (
    <footer className="mt-12 pb-8">
      <div className="mx-auto max-w-5xl px-4 text-center text-gold/80 sm:px-6">
        <Ornament glyph="❦" className="mx-auto mb-3 max-w-md" />
        <p className="font-slab text-[10px] tracking-[0.25em] uppercase">
          Reel Roulette · An Original Student Production
        </p>
        <p className="mt-1 font-serif text-xs text-paper/60 italic">
          A swipeable picture-show lottery, built with Next.js and Supabase.
        </p>
      </div>
    </footer>
  );
}
