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
    <header className={cn("broadside mx-auto max-w-2xl px-5 py-2 text-center", className)}>
      <p className="font-slab text-[9px] tracking-[0.3em] text-crimson uppercase">{kicker}</p>
      <Ornament className="my-0.5 text-ink" />
      {lead && (
        <p className="font-woodtype text-xs leading-tight tracking-wide uppercase sm:text-sm">
          {lead}
        </p>
      )}
      <h1 className="text-2xl leading-none tracking-wide uppercase sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 font-serif text-[11px] italic sm:text-xs">{subtitle}</p>}
    </header>
  );
}
