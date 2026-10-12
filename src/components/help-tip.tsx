import * as React from "react";
import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

// A small printed notice that appears on hover / focus of whatever group it
// sits in. Its parent needs `group relative`; `className` places it.
export function TipPanel({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  // A span (made a block), so it may sit inside a line of text.
  return (
    <span
      id={id}
      role="tooltip"
      className={cn(
        "broadside pointer-events-none absolute z-50 block w-60 px-3 py-2 text-left font-serif text-xs leading-snug font-normal tracking-normal normal-case opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100",
        className
      )}
    >
      <span className="font-slab text-[9px] tracking-[0.2em] text-crimson uppercase">{title}</span>
      <br />
      {children}
    </span>
  );
}

const ALIGN = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
} as const;

// A "?" beside a control: hover or focus it for a word on what the control
// does. `tone` matches what it sits on (gold on the velvet / felt, ink on
// paper); `align` keeps the notice on screen near an edge.
export function HelpTip({
  title,
  children,
  tone = "gold",
  side = "bottom",
  align = "center",
  className,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "gold" | "ink";
  side?: "top" | "bottom";
  align?: keyof typeof ALIGN;
  className?: string;
}) {
  const tipId = React.useId();

  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={`About ${title}`}
        aria-describedby={tipId}
        className={cn(
          "inline-flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2",
          tone === "gold"
            ? "text-gold-light/70 hover:text-gold-light focus-visible:ring-gold-light"
            : "text-ink/55 hover:text-ink focus-visible:ring-crimson"
        )}
      >
        <HelpCircle className="size-4" />
      </button>
      <TipPanel
        id={tipId}
        title={title}
        className={cn(side === "bottom" ? "top-full mt-2" : "bottom-full mb-2", ALIGN[align])}
      >
        {children}
      </TipPanel>
    </span>
  );
}
