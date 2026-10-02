import * as React from "react";

import { GENRE_META } from "@/lib/genre-meta";
import type { GenreSlug } from "@/lib/types";
import { CardBack } from "@/components/card-back";

// A green-baize card table: polished wooden rail, gold piping, gold printing
// on the felt (an inner racetrack line and a ring of the ten suits), a
// scatter of chips at one end and your deck at the other.
export function CasinoTable({
  children,
  deckCount,
  onDeal,
}: {
  children: React.ReactNode;
  deckCount: number;
  onDeal: () => void;
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
        className="relative isolate flex min-h-[250px] flex-col items-center justify-center gap-5 overflow-hidden rounded-[38px] border-2 border-gold/70 px-5 py-5 sm:flex-row sm:rounded-[140px] sm:px-28 sm:py-5"
        style={{
          backgroundColor: "var(--felt)",
          backgroundImage:
            "radial-gradient(rgb(0 0 0 / 0.14) 1px, transparent 1px), radial-gradient(ellipse at 50% 40%, #2c8c55 0%, #1e6b40 45%, #0f3d24 100%)",
          backgroundSize: "3px 3px, 100% 100%",
          boxShadow: "inset 0 0 40px rgb(0 0 0 / 0.55)",
        }}
      >
        <FeltPrint />
        <Chips />
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

const CHIP_COLORS = {
  crimson: { face: "#a61e22", stripe: "#f3e9d2" },
  ink: { face: "#1b1612", stripe: "#f3e9d2" },
  gold: { face: "#c99a2e", stripe: "#1b1612" },
  cream: { face: "#efe3c6", stripe: "#a61e22" },
} as const;

// A short stack of poker chips seen from just above.
function ChipStack({
  color,
  count,
  x,
  y,
}: {
  color: keyof typeof CHIP_COLORS;
  count: number;
  x: number;
  y: number;
}) {
  const { face, stripe } = CHIP_COLORS[color];
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {Array.from({ length: count }).map((_, k) => (
        <span
          key={k}
          className="absolute block size-11 rounded-full"
          style={{
            top: -k * 5,
            background: `repeating-conic-gradient(${face} 0deg 22.5deg, ${stripe} 22.5deg 45deg)`,
            boxShadow: `0 4px 0 color-mix(in srgb, ${face} 55%, #000), 0 7px 10px rgb(0 0 0 / 0.4)`,
          }}
        >
          <span
            className="absolute inset-[17%] rounded-full border border-dashed"
            style={{ background: face, borderColor: stripe }}
          />
        </span>
      ))}
    </div>
  );
}

function Chips() {
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/2 left-7 hidden h-28 w-24 -translate-y-1/2 sm:block">
      <ChipStack color="crimson" count={5} x={2} y={30} />
      <ChipStack color="ink" count={3} x={40} y={56} />
      <ChipStack color="gold" count={2} x={36} y={6} />
      <ChipStack color="cream" count={1} x={8} y={74} />
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
