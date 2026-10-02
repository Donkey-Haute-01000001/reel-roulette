import * as React from "react";

import { GENRE_META } from "@/lib/genre-meta";
import type { GenreSlug } from "@/lib/types";
import { CardBack } from "@/components/card-back";

// A green-baize card table: polished wooden rail, gold piping, gold printing
// on the felt (an inner racetrack line and a ring of the ten suits), the
// house's card shoe at one end (Hit Me) and your own deck at the other (Deal).
export function CasinoTable({
  children,
  deckCount,
  onDeal,
  houseDisabled,
  onHitMe,
}: {
  children: React.ReactNode;
  deckCount: number;
  onDeal: () => void;
  houseDisabled: boolean;
  onHitMe: () => void;
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
        className="relative isolate flex min-h-[210px] flex-col items-center justify-center gap-5 rounded-[38px] border-2 border-gold/70 px-5 py-4 sm:flex-row sm:rounded-[140px] sm:px-28 sm:py-4"
        style={{
          backgroundColor: "var(--felt)",
          backgroundImage:
            "radial-gradient(rgb(0 0 0 / 0.14) 1px, transparent 1px), radial-gradient(ellipse at 50% 40%, #2c8c55 0%, #1e6b40 45%, #0f3d24 100%)",
          backgroundSize: "3px 3px, 100% 100%",
          boxShadow: "inset 0 0 40px rgb(0 0 0 / 0.55)",
        }}
      >
        <FeltPrint />
        <HouseShoe disabled={houseDisabled} onHitMe={onHitMe} />
        <HandDeck count={deckCount} onDeal={onDeal} />
        {children}
      </div>
    </section>
  );
}

// Gold printing on the felt, behind everything else.
function FeltPrint() {
  const suits = Object.keys(GENRE_META) as GenreSlug[];
  const radius = 112;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-3 rounded-[28px] border border-gold/35 sm:inset-4 sm:rounded-[124px]" />
      <div className="absolute inset-[22px] rounded-[20px] border border-dashed border-gold/20 sm:inset-[26px] sm:rounded-[114px]" />

      <div className="absolute top-1/2 left-1/2 size-0 opacity-[0.22]">
        <div
          className="absolute rounded-full border border-gold"
          style={{ width: radius * 2 + 52, height: radius * 2 + 52, left: -(radius + 26), top: -(radius + 26) }}
        />
        <div
          className="absolute rounded-full border border-gold"
          style={{ width: radius * 2 - 52, height: radius * 2 - 52, left: -(radius - 26), top: -(radius - 26) }}
        />
        {suits.map((slug, i) => {
          const Icon = GENRE_META[slug].icon;
          const angle = (i / suits.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <Icon
              key={slug}
              className="absolute size-6 text-gold-light"
              strokeWidth={1.75}
              style={{
                left: Math.cos(angle) * radius - 12,
                top: Math.sin(angle) * radius - 12,
              }}
            />
          );
        })}
        <p className="absolute -left-20 -top-4 w-40 text-center font-woodtype text-lg leading-none text-gold-light">
          Reel
          <br />
          Roulette
        </p>
      </div>
    </div>
  );
}

// The house's card shoe: a wooden dealing box with cards slanting out of it.
// Pressing it is Hit Me — a card from the house you haven't kept yet. A
// printed notice explains as much on hover / focus.
function HouseShoe({ disabled, onHitMe }: { disabled: boolean; onHitMe: () => void }) {
  const tipId = React.useId();

  return (
    <div className="group absolute top-1/2 left-7 z-10 hidden -translate-y-1/2 sm:block">
      <button
        type="button"
        onClick={onHitMe}
        disabled={disabled}
        aria-label="Hit Me: deal a card from the house"
        aria-describedby={tipId}
        className="flex flex-col items-center gap-2 outline-none disabled:opacity-50"
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
      <div
        id={tipId}
        role="tooltip"
        className="broadside pointer-events-none absolute top-1/2 left-full z-50 ml-4 w-56 -translate-y-1/2 px-3 py-2 text-left font-serif text-xs leading-snug opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <span className="font-slab text-[9px] tracking-[0.2em] text-crimson uppercase">Hit Me</span>
        <br />
        {disabled
          ? "Every picture in the house already sits in your deck. The dealer has nothing new to offer."
          : "The dealer draws a fresh card from the house, a picture not yet in your Watch Deck. Should it please you, add it to your deck."}
      </div>
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
      className="group absolute top-1/2 right-8 hidden -translate-y-1/2 flex-col items-center gap-2 disabled:opacity-50 sm:flex"
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
