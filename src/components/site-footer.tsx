"use client";

import { usePathname } from "next/navigation";

// A quiet sign-off at the foot of the page: just the house name and a line,
// barely lit until you look closer. Left off the Watch Deck, whose hand sits
// right at the bottom of the screen.
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/watchlist") return null;

  return (
    <footer className="mt-3 pb-2 short:mt-1">
      <div className="mx-auto flex max-w-md flex-col items-center gap-1.5 px-4 text-center opacity-45 transition-opacity duration-700 hover:opacity-90">
        <span aria-hidden className="h-px w-10 bg-gold/60" />
        <p className="font-slab text-[9px] tracking-[0.5em] text-gold-light uppercase">
          Reel Roulette
        </p>
        <p className="font-serif text-xs tracking-wide text-paper/80 italic">
          “What is this earth without art? Just a rock.”
        </p>
      </div>
    </footer>
  );
}
