"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Menu, X } from "lucide-react";
import * as React from "react";

import { TABS } from "@/lib/tabs";
import { openWelcome } from "@/components/welcome-dialog";
import { cn } from "@/lib/utils";

// A slim, quiet bar: the name in small gold woodtype and the three tabs as
// spaced-out caps, the current one marked with a thin gold underline. The "?"
// brings back the welcome notice explaining how to play.
export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gold/40 bg-[#081a10]">
      <div className="mx-auto flex h-10 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="gold-leaf font-woodtype text-base tracking-wide">
          Reel Roulette
        </Link>

        <div className="flex items-center gap-2 sm:gap-6">
          <nav className="hidden items-center gap-6 sm:flex">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-b py-1 font-slab text-[9px] tracking-[0.25em] uppercase transition-colors",
                    active
                      ? "border-gold-light text-gold-light"
                      : "border-transparent text-paper/60 hover:text-paper"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="inline-flex size-8 items-center justify-center text-gold-light/70 transition-colors hover:text-gold-light sm:size-6"
            onClick={openWelcome}
            aria-label="How to play"
            title="How to play"
          >
            <HelpCircle className="size-4" />
          </button>

          <button
            className="inline-flex size-8 items-center justify-center text-paper/70 sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col border-t border-gold/20 px-4 py-2 sm:hidden">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "py-2 font-slab text-[10px] tracking-[0.25em] uppercase",
                  active ? "text-gold-light" : "text-paper/60"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
