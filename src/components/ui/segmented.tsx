"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-[4px] border border-gold/50 bg-black/30 p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 font-slab text-[9px] tracking-[0.12em] uppercase transition-colors disabled:opacity-50 [&_svg]:size-3.5",
              active
                ? "bg-crimson text-paper shadow-[inset_0_0_0_1px_rgb(212_165_49/0.8)]"
                : "text-paper/70 hover:text-gold-light"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
