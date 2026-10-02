import * as React from "react";

import { cn } from "@/lib/utils";

// Victorian pieces shared across pages: an ornamental rule, and the gilded
// page title.

export function Ornament({
  glyph = "✦",
  className,
}: {
  glyph?: string;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("flex items-center gap-2", className)}>
      <span className="h-px flex-1 bg-current opacity-60" />
      <span className="h-[3px] w-6 border-y border-current opacity-60" />
      <span className="text-[0.7em] leading-none">{glyph}</span>
      <span className="h-[3px] w-6 border-y border-current opacity-60" />
      <span className="h-px flex-1 bg-current opacity-60" />
    </div>
  );
}

// A page title signwritten in gold leaf straight onto the velvet, between
// two fine gold rules: no paper, no frame, so it reads as part of the theatre
// rather than a notice pinned on top. `left` / `right` add signposts either
// side (e.g. what each swipe direction means); on phones they sit beneath.
export function GildedTitle({
  title,
  tagline,
  left,
  right,
  className,
}: {
  title: string;
  tagline?: string;
  left?: [string, string];
  right?: [string, string];
  className?: string;
}) {
  const block = (
    <div className="flex w-full max-w-xs flex-col items-center text-center">
      <Ornament className="w-full text-[11px] text-gold/60" />
      {/* Left padding balances the trailing letter-spacing, keeping it centred */}
      <h1 className="gold-leaf my-0.5 pl-[0.35em] font-woodtype text-2xl tracking-[0.35em] uppercase drop-shadow-[0_2px_2px_rgb(0_0_0/0.6)] sm:text-[1.7rem]">
        {title}
      </h1>
      {tagline && <p className="font-serif text-xs text-paper/65 italic">{tagline}</p>}
      <Ornament className="mt-1 w-full text-[11px] text-gold/60" />
    </div>
  );

  if (!left && !right) {
    return <header className={cn("mx-auto flex justify-center", className)}>{block}</header>;
  }

  const sign = (lines: [string, string], side: "left" | "right") => (
    <p
      className={cn(
        "font-slab text-[8px] leading-relaxed tracking-[0.2em] uppercase sm:text-[9px]",
        side === "left" ? "text-right text-[#e8857f]" : "text-left text-[#8fd3a6]"
      )}
    >
      {side === "left" ? "◂ " : ""}
      {lines[0]}
      <br />
      {lines[1]}
      {side === "right" ? " ▸" : ""}
    </p>
  );

  return (
    <header
      className={cn(
        "mx-auto grid max-w-2xl grid-cols-2 items-center gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-6",
        className
      )}
    >
      <div className="col-span-2 flex justify-center sm:order-2 sm:col-span-1">{block}</div>
      <div className="sm:order-1">{left && sign(left, "left")}</div>
      <div className="sm:order-3">{right && sign(right, "right")}</div>
    </header>
  );
}
