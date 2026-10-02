// A quiet sign-off at the foot of the page: just the house name and a line,
// barely lit until you look closer.
export function SiteFooter() {
  return (
    <footer className="mt-16 pb-12">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 text-center opacity-45 transition-opacity duration-700 hover:opacity-90">
        <span aria-hidden className="h-px w-10 bg-gold/60" />
        <p className="font-slab text-[9px] tracking-[0.5em] text-gold-light uppercase">
          Reel Roulette
        </p>
        <p className="font-serif text-xs tracking-wide text-paper/80 italic">
          What is this earth without art? Just a rock.
        </p>
      </div>
    </footer>
  );
}
