import * as React from "react";

import { cn } from "@/lib/utils";

// Victorian broadside pieces: an ornamental rule, and the compact poster
// header each page opens with — a dense centred stack of mixed woodtype
// faces in tiered sizes (kicker → lead → headline → small print).

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

export function BroadsideBanner({
  kicker,
  lead,
  title,
  subtitle,
  className,
}: {
  kicker: string;
  lead?: string;
  title: string;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("broadside mx-auto max-w-2xl px-5 py-3 text-center", className)}>
      <p className="font-slab text-[10px] tracking-[0.3em] text-crimson uppercase">{kicker}</p>
      <Ornament className="my-1 text-ink" />
      {lead && (
        <p className="font-woodtype text-sm leading-tight tracking-wide uppercase sm:text-base">
          {lead}
        </p>
      )}
      <h1 className="text-[1.75rem] leading-none tracking-wide uppercase sm:text-4xl">{title}</h1>
      {subtitle && (
        <>
          <Ornament glyph="❦" className="my-1.5 text-ink" />
          <p className="font-serif text-xs italic sm:text-sm">{subtitle}</p>
        </>
      )}
    </header>
  );
}
