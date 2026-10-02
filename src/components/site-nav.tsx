"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Menu, X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Swipe" },
  { href: "/watchlist", label: "Watch Deck" },
  { href: "/roulette", label: "Spin" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-4 border-double border-gold/80 bg-[#081a10] shadow-[0_6px_20px_rgb(0_0_0/0.5)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full border-2 border-gold bg-crimson text-paper shadow-[inset_0_0_0_2px_rgb(0_0_0/0.25)]">
            <Clapperboard className="size-4" />
          </span>
          <span className="gold-leaf font-woodtype text-lg tracking-wide sm:text-xl">
            Reel Roulette
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-[3px] border px-3.5 py-1.5 font-slab text-[11px] tracking-[0.14em] uppercase transition-colors",
                pathname === link.href
                  ? "border-gold bg-crimson text-paper shadow-[inset_0_0_0_2px_rgb(0_0_0/0.22)]"
                  : "border-transparent text-paper/75 hover:text-gold-light"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          className="inline-flex size-9 items-center justify-center rounded-full sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-gold/40 px-4 py-3 sm:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-[3px] border px-4 py-2 font-slab text-xs tracking-[0.14em] uppercase",
                pathname === link.href
                  ? "border-gold bg-crimson text-paper"
                  : "border-transparent text-paper/75"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
