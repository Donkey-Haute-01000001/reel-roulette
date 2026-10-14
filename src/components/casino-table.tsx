import * as React from "react";

import { CardBack } from "@/components/card-back";
import { HelpTip } from "@/components/help-tip";

export function hitMeTip(disabled: boolean) {
  return disabled
    ? "Every picture in the house already sits in your deck. The dealer has nothing new to offer."
    : "The dealer draws a fresh card from the house, a picture not yet in your Watch Deck. Should it please you, add it to your deck.";
}

// A green-baize card table: polished wooden rail, gold piping, two gold
// racetrack lines printed on the felt. On wider screens it keeps one height,
// sized for the tallest placard, so playing a card never resizes the page.
// The house's card shoe sits at one end (Hit Me) and your own deck at the
// other (Deal, with `fold` set beneath it).
export function CasinoTable({
  children,
  deckCount,
  onDeal,
  houseDisabled,
  onHitMe,
  fold,
}: {
  children: React.ReactNode;
  deckCount: number;
  onDeal: () => void;
  houseDisabled: boolean;
  onHitMe: () => void;
  fold?: React.ReactNode;
}) {
  return (
    <section
      aria-label="Table"
      aria-live="polite"
      className="rounded-[48px] p-3 sm:rounded-[150px] sm:p-4"
      style={{
        background: "linear-gradient(180deg, #74431d 0%, #4a2a12 45%, #2a170a 100%)",
        boxShadow:
          "inset 0 2px 0 rgb(255 255 255 / 0.18), inset 0 -3px 6px rgb(0 0 0 / 0.5), 0 24px 40px -12px rgb(0 0 0 / 0.8)",
      }}
    >
      <div
        className="relative isolate flex min-h-[210px] flex-col sm:h-[340px] items-center justify-center gap-5 rounded-[38px] border-2 border-gold/70 px-5 py-4 sm:flex-row sm:rounded-[140px] sm:px-48 sm:py-4"
        style={{
          backgroundColor: "var(--felt)",
          backgroundImage:
            "radial-gradient(rgb(0 0 0 / 0.14) 1px, transparent 1px), radial-gradient(ellipse at 50% 40%, #2c8c55 0%, #1e6b40 45%, #0f3d24 100%)",
          backgroundSize: "3px 3px, 100% 100%",
          boxShadow: "inset 0 0 40px rgb(0 0 0 / 0.55)",
        }}
      >
        <FeltLines />
        <HouseShoe disabled={houseDisabled} onHitMe={onHitMe} />
        <div className="absolute top-1/2 right-[88px] z-10 hidden -translate-y-1/2 flex-col items-center gap-2.5 sm:flex">
          <HandDeck count={deckCount} onDeal={onDeal} />
          {fold}
        </div>
        {children}
      </div>
    </section>
  );
}

// The racetrack lines printed in gold on the felt, behind everything else.
function FeltLines() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-3 rounded-[28px] border border-gold/35 sm:inset-4 sm:rounded-[124px]" />
      <div className="absolute inset-[22px] rounded-[20px] border border-dashed border-gold/20 sm:inset-[26px] sm:rounded-[114px]" />
    </div>
  );
}

// The house's card shoe: a wooden dealing box with cards slanting out of it.
// Pressing it is Hit Me — a card from the house you haven't kept yet. The
// "?" beside it explains as much, only when asked, so the notice never
// covers the felt while you're dealing.
function HouseShoe({ disabled, onHitMe }: { disabled: boolean; onHitMe: () => void }) {
  return (
    <div className="absolute top-1/2 left-[88px] z-10 hidden -translate-y-1/2 sm:block">
      <button
        type="button"
        onClick={onHitMe}
        disabled={disabled}
        aria-label="Hit Me: deal a card from the house"
        className="group flex flex-col items-center gap-2 outline-none disabled:opacity-50"
      >
        <div className="relative h-[86px] w-[70px] transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0">
          {/* Cards slanting out of the shoe's mouth */}
          <div className="absolute top-1 left-3 w-[46px] -rotate-[14deg]">
            <CardBack className="shadow-[0_2px_4px_rgb(0_0_0/0.4)]" />
          </div>
          <div className="absolute top-2.5 left-2 w-[46px] -rotate-[8deg]">
            <CardBack className="shadow-[0_2px_4px_rgb(0_0_0/0.4)]" />
          </div>
          {/* The shoe */}
          <div
            className="absolute inset-x-0 bottom-0 h-[52px] rounded-[6px] border border-[#a7791c] shadow-[0_6px_12px_rgb(0_0_0/0.5)]"
            style={{ background: "linear-gradient(180deg, #6b3f1c, #3c220e)" }}
          >
            <div className="absolute inset-x-2 top-1.5 h-px bg-[#d4a531]/70" />
            <p className="absolute inset-x-0 bottom-1.5 text-center font-woodtype text-[10px] text-[#f1d27a]">
              House
            </p>
          </div>
        </div>
        <span className="rounded-[3px] border border-gold/70 bg-crimson px-2 py-1 font-slab text-[8px] tracking-[0.2em] text-paper uppercase shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)] group-hover:brightness-115">
          Hit Me
        </span>
      </button>
      <HelpTip title="Hit Me" side="top" align="start" className="absolute bottom-0 -right-6">
        {hitMeTip(disabled)}
      </HelpTip>
    </div>
  );
}

// Your deck, face down on the felt. Clicking it deals a random card from your hand.
function HandDeck({ count, onDeal }: { count: number; onDeal: () => void }) {
  return (
    <button
      type="button"
      onClick={onDeal}
      disabled={count === 0}
      aria-label="Deal a random card from your hand"
      className="group flex flex-col items-center gap-2 disabled:opacity-50"
    >
      <div className="relative w-[62px] transition-transform duration-200 group-hover:-translate-y-1 group-active:translate-y-0">
        {/* A few cards peeking out underneath for depth */}
        <div className="absolute inset-0 translate-x-[4px] translate-y-[4px] rounded-[4px] bg-[#e6dcc6] shadow-[0_6px_12px_rgb(0_0_0/0.45)]" />
        <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] rounded-[4px] bg-[#efe6d2]" />
        <CardBack className="shadow-[0_2px_4px_rgb(0_0_0/0.35)]" />
      </div>
      <span className="font-slab text-[8px] tracking-[0.2em] text-gold-light uppercase group-hover:text-paper">
        Deal · {count}
      </span>
    </button>
  );
}
