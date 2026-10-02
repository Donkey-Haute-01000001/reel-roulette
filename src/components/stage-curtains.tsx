"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";

import { TABS, tabIndex } from "@/lib/tabs";
import { cn } from "@/lib/utils";

// Deep burgundy stage velvet: vertical folds catching the light.
const VELVET =
  "repeating-linear-gradient(90deg, #3a060b 0px, #6b111a 9px, #973039 15px, #6b111a 21px, #3a060b 32px)";

// Tone-on-tone damask woven into the velvet: an ogee lattice with a small
// fleuron in each cell, a shade darker than the cloth.
const FLEURON =
  "<g fill='#2a0305' fill-opacity='0.42'>" +
  "<path d='M0 -10C4 -5 4 -1 0 3C-4 -1 -4 -5 0 -10Z'/>" +
  "<path d='M0 -10C4 -5 4 -1 0 3C-4 -1 -4 -5 0 -10Z' transform='rotate(115)'/>" +
  "<path d='M0 -10C4 -5 4 -1 0 3C-4 -1 -4 -5 0 -10Z' transform='rotate(-115)'/>" +
  "<circle r='2'/></g>";
const DAMASK_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='112' viewBox='0 0 80 112'>" +
  "<g fill='none' stroke='#2a0305' stroke-opacity='0.45' stroke-width='1.4'>" +
  "<path d='M40 0C62 18 62 38 40 56C18 74 18 94 40 112'/>" +
  "<path d='M40 0C18 18 18 38 40 56C62 74 62 94 40 112'/>" +
  "<path d='M0 0C22 18 22 38 0 56C-22 74 -22 94 0 112'/>" +
  "<path d='M80 0C58 18 58 38 80 56C102 74 102 94 80 112'/>" +
  "</g>" +
  `<g transform='translate(40 28)'>${FLEURON}</g>` +
  `<g transform='translate(40 84) rotate(180)'>${FLEURON}</g>` +
  `<g transform='translate(0 84) rotate(180)'>${FLEURON}</g>` +
  `<g transform='translate(80 84) rotate(180)'>${FLEURON}</g>` +
  "</svg>";
const DAMASK = `url("data:image/svg+xml,${encodeURIComponent(DAMASK_SVG)}")`;

// Gold scrollwork for the embroidered hem: a running vine with curls.
const SCROLL_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='48' height='24' viewBox='0 0 48 24'>" +
  "<g fill='none' stroke='#f1d27a' stroke-width='1.6' stroke-linecap='round'>" +
  "<path d='M0 12C6 2 18 2 24 12C30 22 42 22 48 12'/>" +
  "<path d='M12 6.5C9 9 11 13 14 11'/>" +
  "<path d='M36 17.5C39 15 37 11 34 13'/>" +
  "</g>" +
  "<g fill='#f1d27a'><circle cx='24' cy='12' r='1.6'/><ellipse cx='6' cy='16' rx='1.4' ry='3' transform='rotate(-30 6 16)'/>" +
  "<ellipse cx='42' cy='8' rx='1.4' ry='3' transform='rotate(-30 42 8)'/></g>" +
  "</svg>";
const SCROLLS = `url("data:image/svg+xml,${encodeURIComponent(SCROLL_SVG)}")`;

const SWEEP_S = 0.55;

// "open"    — curtains drawn back, page visible
// "closing" — sweeping shut after a tassel was pulled
// "closed"  — shut; the next page is loading behind them
// "opening" — the new page has arrived; drawing back to reveal it
type Phase = "open" | "closing" | "closed" | "opening";

// A theatre proscenium for every page: burgundy velvet drapes tied back at
// either side with gold cord and tassels. They're part of the page, running from under the nav all the
// way down to the foot of the page, and scroll with it rather than following
// the window. Pulling a tassel draws that side's curtain across the
// stage, changes to the neighbouring tab behind it, and draws it back again.
// The first tab has no left tassel and the last no right one.
export function StageCurtains() {
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("open");
  const [target, setTarget] = React.useState<string | null>(null);
  // Which curtain was pulled: it alone sweeps across and back.
  const [side, setSide] = React.useState<"left" | "right">("right");

  const current = tabIndex(pathname);
  const prev = current > 0 ? TABS[current - 1] : null;
  const next = current < TABS.length - 1 ? TABS[current + 1] : null;

  // The new page has rendered behind the closed curtain: reveal it.
  // (Adjusting state during render on a pathname change, per React's
  // guidance, rather than in an effect.)
  if (phase === "closed" && target === pathname) {
    setPhase("opening");
    setTarget(null);
  }

  // Safety net: never leave the curtain shut if the navigation stalls.
  React.useEffect(() => {
    if (phase !== "closed") return;
    const t = setTimeout(() => {
      setPhase("opening");
      setTarget(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [phase]);

  const pull = (href: string, from: "left" | "right") => {
    if (phase !== "open" || href === pathname) return;
    router.prefetch(href);
    setSide(from);
    setTarget(href);
    setPhase("closing");
  };

  const shut = phase === "closing" || phase === "closed";

  return (
    <>
      <Valance />
      <Drape side="left" />
      <Drape side="right" />
      {prev && (
        <TieBack side="left" label={prev.label} onPull={() => pull(prev.href, "left")} pulled={shut && side === "left"} />
      )}
      {next && (
        <TieBack side="right" label={next.label} onPull={() => pull(next.href, "right")} pulled={shut && side === "right"} />
      )}

      {/* The pulled curtain, drawn across the stage (below the nav) for a tab change */}
      {phase !== "open" && (
        <div aria-hidden className="fixed inset-x-0 top-10 bottom-0 z-[25] overflow-hidden">
          <motion.div
            className="absolute inset-y-0 w-full"
            style={{
              backgroundImage: `linear-gradient(180deg, rgb(0 0 0 / 0.3), transparent 25%, transparent 75%, rgb(0 0 0 / 0.5)), ${DAMASK}, ${VELVET}`,
              boxShadow: side === "right" ? "-10px 0 28px rgb(0 0 0 / 0.6)" : "10px 0 28px rgb(0 0 0 / 0.6)",
            }}
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: shut ? "0%" : side === "right" ? "100%" : "-100%" }}
            transition={{ duration: SWEEP_S, ease: [0.6, 0, 0.3, 1] }}
            onAnimationComplete={() => {
              if (phase === "closing") {
                setPhase("closed");
                if (target) router.push(target);
              } else if (phase === "opening") {
                setPhase("open");
              }
            }}
          >
            <Crest />
            <EmbroideredHem />
            {/* Wide gold braid down the leading edge */}
            <div
              className="absolute inset-y-0 w-3"
              style={{
                [side === "right" ? "left" : "right"]: 0,
                background: BRAID,
              }}
            />
          </motion.div>
        </div>
      )}
    </>
  );
}

// Gold braid trim, as on the drapes' leading edges.
const BRAID =
  "linear-gradient(90deg, rgb(0 0 0 / 0.35), transparent 30%, transparent 70%, rgb(0 0 0 / 0.35)), repeating-linear-gradient(180deg, #f1d27a 0 3px, #b8862a 3px 5px, #6e4f12 5px 6px)";

// A slim valance under the nav: a thin velvet band with a gold edge and a
// row of small scalloped swags.
const SWAGS = "radial-gradient(11px 9px at 50% 0, #000 96%, transparent 100%) 0 0 / 22px 9px repeat-x";

function Valance() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-10 z-30 drop-shadow-[0_3px_3px_rgb(0_0_0/0.45)]"
    >
      <div className="h-1 border-b border-[#e2b851]" style={{ backgroundImage: VELVET }} />
      <div className="drop-shadow-[0_1px_0_var(--gold)]">
        <div className="h-[9px]" style={{ backgroundImage: VELVET, WebkitMask: SWAGS, mask: SWAGS }} />
      </div>
    </div>
  );
}

// The drapes only take up the empty margin beside the content (100vw counts
// the scrollbar, hence the extra allowance), and are only shown from 1200px
// wide, where that margin is roomy enough for them and their tassels.
const DRAPE_WIDTH = "clamp(0px, calc((100vw - 64rem) / 2 - 20px), 180px)";
// How far down the drapes are gathered at the tie-backs: a fixed distance,
// so the tassels stay within the first screenful however long the page is.
const TIE_Y = "60vh";
const TRIM = 9; // px of gold braid showing along each drape's leading edge

// The drape's outline: gathered toward the outer edge at the tie-back, then
// falling loose to the hem. `inset` pulls the leading edge in, so a gold
// layer drawn at inset 0 shows as braid along that edge.
function drapeShape(side: "left" | "right", inset: number) {
  const edge: [number, string][] = [
    [100, "0px"],
    [97, `calc(${TIE_Y} * 0.27)`],
    [88, `calc(${TIE_Y} * 0.57)`],
    [66, `calc(${TIE_Y} * 0.85)`],
    [34, TIE_Y],
    [44, `calc(${TIE_Y} + 14vh)`],
    [60, "100%"],
  ];
  if (side === "left") {
    const pts = edge.map(([x, y]) => `calc(${x}% - ${inset}px) ${y}`);
    return `polygon(0 0, ${pts.join(", ")}, 0 100%)`;
  }
  const pts = [...edge].reverse().map(([x, y]) => `calc(${100 - x}% + ${inset}px) ${y}`);
  return `polygon(100% 0, 100% 100%, ${pts.join(", ")})`;
}

function Drape({ side }: { side: "left" | "right" }) {
  const left = side === "left";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-10 bottom-0 z-20 hidden min-[1200px]:block"
      style={{ [side]: 0, width: DRAPE_WIDTH }}
    >
      {/* Gold braid, showing only along the leading edge */}
      <div className="absolute inset-0" style={{ background: BRAID, clipPath: drapeShape(side, 0) }} />
      {/* The velvet */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(${left ? "90deg" : "270deg"}, rgb(0 0 0 / 0.45), transparent 35%, rgb(0 0 0 / 0.25)), linear-gradient(180deg, rgb(0 0 0 / 0.35), transparent 20%, transparent 80%, rgb(0 0 0 / 0.45)), ${DAMASK}, ${VELVET}`,
          clipPath: drapeShape(side, TRIM),
        }}
      >
        <EmbroideredHem />
      </div>
    </div>
  );
}

// The tie-back: a gold cord looped around the drape with a heavy tassel
// hanging from it. The cord and tassel are the button that pulls the curtain
// to the neighbouring tab; hovering sways the tassel and names the tab.
function TieBack({
  side,
  label,
  onPull,
  pulled,
}: {
  side: "left" | "right";
  label: string;
  onPull: () => void;
  pulled: boolean;
}) {
  const left = side === "left";

  return (
    <div
      className="pointer-events-none absolute top-10 bottom-0 z-20 hidden min-[1200px]:block"
      style={{ [side]: 0, width: DRAPE_WIDTH }}
    >
      <motion.button
        type="button"
        onClick={onPull}
        aria-label={`Go to ${label}`}
        title={label}
        className="group pointer-events-auto absolute h-6 cursor-pointer outline-none"
        style={{ [side]: 0, top: `calc(${TIE_Y} - 16px)`, width: "40%" }}
        initial="rest"
        whileHover="hover"
        whileFocus="hover"
        animate={pulled ? "pulled" : "rest"}
      >
        {/* The cord, wrapped around the gathered drape */}
        <svg
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full drop-shadow-[0_2px_2px_rgb(0_0_0/0.6)]"
          style={{ transform: left ? undefined : "scaleX(-1)" }}
        >
          <path d="M0 4 C 34 22, 70 22, 100 12" fill="none" stroke="#8a6417" strokeWidth="3.4" vectorEffect="non-scaling-stroke" />
          <path
            d="M0 4 C 34 22, 70 22, 100 12"
            fill="none"
            stroke="#f1d27a"
            strokeWidth="3.4"
            strokeDasharray="2.2 2.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* The tassel, hanging from the cord where it meets the drape's edge */}
        <motion.span
          className="absolute top-2 block w-7 origin-top"
          style={{ [left ? "right" : "left"]: -12 }}
          variants={{
            rest: { rotate: 0, y: 0 },
            hover: { rotate: [0, left ? 7 : -7, left ? -5 : 5, left ? 2 : -2, 0], transition: { duration: 1.1 } },
            pulled: { rotate: [0, left ? 22 : -22, left ? -10 : 10, 0], y: [0, 12, 0, 0], transition: { duration: 0.6 } },
          }}
        >
          {/* An idle sway every few seconds, as if caught by a draught, to
              hint that the tassel can be pulled. The two sides sway at
              different moments; off for reduced-motion users. */}
          <span
            className="block origin-top motion-safe:animate-[tassel-idle_7s_ease-in-out_infinite]"
            style={{ animationDelay: left ? "1.5s" : "5s" }}
          >
            <Tassel />
          </span>
        </motion.span>

        {/* The destination, set beside the tassel on the green where the
            drape is gathered in (always the side toward the page, so it can
            never stick out past the window). Quiet until hovered / focused. */}
        <span
          className={cn(
            "pointer-events-none absolute top-[38px] flex flex-col leading-tight whitespace-nowrap opacity-70 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100",
            left ? "items-start text-left" : "items-end text-right"
          )}
          style={{ [left ? "left" : "right"]: "calc(100% + 22px)" }}
        >
          <span className="font-serif text-[10px] text-paper/60 italic">pull for</span>
          <span className="font-slab text-[9px] tracking-[0.25em] text-gold-light uppercase">
            {label}
          </span>
        </span>
      </motion.button>
    </div>
  );
}

// A heavy gold tassel: hanging loop, knob, ringed neck, bell-shaped head,
// and a long fringe skirt.
const FRINGE = Array.from({ length: 15 }, (_, i) => i);

function Tassel() {
  const id = React.useId().replace(/:/g, "");
  const gold = `url(#${id})`;

  return (
    <svg viewBox="0 0 40 120" className="h-auto w-full drop-shadow-[0_3px_3px_rgb(0_0_0/0.55)]">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5512" />
          <stop offset="0.45" stopColor="#f6dc8c" />
          <stop offset="1" stopColor="#7a5512" />
        </linearGradient>
      </defs>
      <path d="M20 0 C13 0 13 8 20 9 C27 8 27 0 20 0Z" fill="none" stroke={gold} strokeWidth="2" />
      <circle cx="20" cy="14" r="6" fill={gold} />
      <rect x="15" y="19" width="10" height="3" rx="1.5" fill={gold} />
      <rect x="16" y="23" width="8" height="3" rx="1.5" fill={gold} />
      <path d="M13 27 Q20 23 27 27 L30 46 Q20 50 10 46 Z" fill={gold} />
      {FRINGE.map((i) => (
        <line
          key={i}
          x1={10.5 + i * 1.36}
          y1="49"
          x2={6.5 + i * 1.93}
          y2={112 + (i % 3) * 2}
          stroke={i % 2 ? "#f1d27a" : "#b8862a"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      <rect x="9" y="45" width="22" height="5" rx="2.5" fill="#a7791c" />
    </svg>
  );
}

// Gold embroidery along the foot of a curtain: braid, a band of scrollwork,
// braid again, and a heavy bullion fringe at the very bottom.
function EmbroideredHem() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className="h-[3px] bg-[#f1d27a]/90 shadow-[0_1px_0_rgb(0_0_0/0.4)]" />
      <div className="h-6 opacity-90" style={{ backgroundImage: SCROLLS }} />
      <div className="h-[3px] bg-[#f1d27a]/90 shadow-[0_1px_0_rgb(0_0_0/0.4)]" />
      <div
        className="h-5"
        style={{
          background:
            "linear-gradient(180deg, transparent 60%, rgb(0 0 0 / 0.35)), repeating-linear-gradient(90deg, #f1d27a 0 2px, #a7791c 2px 4px, #6e4f12 4px 5px)",
        }}
      />
    </div>
  );
}

// The theatre's crest, embroidered in gold at the centre of the curtain: an
// "RR" monogram inside a laurel wreath, with a ribbon banner beneath.
const LEAVES = Array.from({ length: 9 }, (_, i) => i);

function Crest() {
  const id = React.useId().replace(/:/g, "");
  const gold = `url(#${id}-gold)`;

  return (
    <svg
      aria-hidden
      viewBox="-120 -120 240 250"
      className="pointer-events-none absolute top-1/2 left-1/2 w-[min(300px,60vw)] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_3px_3px_rgb(0_0_0/0.55)]"
    >
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff1bf" />
          <stop offset="40%" stopColor="#f1d27a" />
          <stop offset="75%" stopColor="#b8862a" />
          <stop offset="100%" stopColor="#f1d27a" />
        </linearGradient>
      </defs>

      {/* Laurel wreath: two sprays of leaves curving up from the base */}
      {[-1, 1].map((dir) => (
        <g key={dir} transform={`scale(${dir} 1)`}>
          <path d="M-8 92 C -78 70, -98 -10, -58 -78" fill="none" stroke={gold} strokeWidth="2.5" />
          {LEAVES.map((i) => {
            const t = i / (LEAVES.length - 1);
            const angle = 100 + t * 125;
            const r = 86;
            const x = Math.cos((angle * Math.PI) / 180) * r * 0.92;
            const y = Math.sin((angle * Math.PI) / 180) * r * 0.98 + 4;
            return (
              <ellipse
                key={i}
                cx={x}
                cy={y}
                rx="6"
                ry="14"
                fill={gold}
                transform={`rotate(${angle - 60} ${x} ${y})`}
              />
            );
          })}
        </g>
      ))}

      {/* Medallion and monogram */}
      <circle r="58" fill="#5c0b0f" stroke={gold} strokeWidth="4" />
      <circle r="50" fill="none" stroke={gold} strokeWidth="1.2" strokeDasharray="3 3" />
      <text
        y="18"
        textAnchor="middle"
        fontSize="52"
        fill={gold}
        style={{ fontFamily: "var(--font-rye)" }}
      >
        RR
      </text>
      <text y="-30" textAnchor="middle" fontSize="12" fill={gold}>
        ✦
      </text>

      {/* Ribbon banner */}
      <path
        d="M-96 92 L-74 80 L74 80 L96 92 L74 104 L-74 104 Z"
        fill="#7a0d12"
        stroke={gold}
        strokeWidth="2"
      />
      <text
        y="97"
        textAnchor="middle"
        fontSize="13"
        letterSpacing="3"
        fill={gold}
        style={{ fontFamily: "var(--font-holtwood)" }}
      >
        REEL ROULETTE
      </text>
    </svg>
  );
}
