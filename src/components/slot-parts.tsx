"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";

import { cn } from "@/lib/utils";

// How the coin slot should look while a coin is in play: "near" when a coin
// is picked up (or hovered), "over" when one is dragged right over the slot.
export type SlotHint = "idle" | "near" | "over";

// Pieces of the Spin machine you play with by hand: the gold coins (one per
// spin left today), the coin slot they go into, and the pull lever.

// ---------------------------------------------------------------------------
// Coin
// ---------------------------------------------------------------------------

// A game-style gold coin: ridged rim and an embossed emblem. Its spin is the
// classic flat trick (it squashes to its edge and back now and then), which
// stays smooth where a true 3D coin was costly to animate.
export function Coin({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="block size-11 animate-[coin-bob_2.4s_ease-in-out_infinite] will-change-transform"
      style={{ animationDelay: `${delay}s` }}
    >
      <span
        className="relative block size-full animate-[coin-spin_3.6s_ease-in-out_infinite] rounded-full will-change-transform"
        style={{
          animationDelay: `${delay * 1.7}s`,
          background: "repeating-conic-gradient(#f6dc8c 0deg 6deg, #b8862a 6deg 12deg)",
          boxShadow: "inset 0 0 0 1px #7a5512, 0 2px 3px rgb(0 0 0 / 0.35)",
        }}
      >
        <span
          className="absolute inset-[13%] flex items-center justify-center rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #fff3c4, #f1d27a 38%, #c99a2e 70%, #8a6417)",
            boxShadow: "inset 0 0 0 1.5px #a7791c, inset 0 -2px 3px rgb(0 0 0 / 0.25)",
          }}
        >
          <span className="font-woodtype text-base leading-none text-[#7a5512] [text-shadow:0_1px_0_#fff1bf]">
            R
          </span>
        </span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// The coin tray
// ---------------------------------------------------------------------------

// Where each coin hovers over the tray, fixed per coin so the others don't
// shuffle round when one is spent.
const COIN_SPOTS = [
  { x: -42, y: -6 },
  { x: 0, y: -22 },
  { x: 42, y: -6 },
];

// The day's coins (one per spin left), hovering over a velvet-lined brass
// tray beside the machine. Drag one into the slot, or click it, and it flies
// in and drops through.
export function FloatingCoins({
  coins,
  enabled,
  slotRef,
  onInsert,
  onHint,
}: {
  coins: number[];
  enabled: boolean;
  slotRef: React.RefObject<HTMLElement | null>;
  onInsert: (id: number) => void;
  onHint: (hint: SlotHint) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative h-32 w-44" role="group" aria-label="Your coins for tonight">
        {/* The tray, seen at an angle: a brass rim around a velvet dish */}
        <div
          aria-hidden
          className="absolute inset-x-1 bottom-2 h-16 rounded-[50%] p-[5px] shadow-[0_10px_18px_rgb(0_0_0/0.6)]"
          style={{ background: "linear-gradient(180deg, #f6dc8c, #a7791c 55%, #6e4f12)" }}
        >
          <div
            className="h-full w-full rounded-[50%] shadow-[inset_0_6px_12px_rgb(0_0_0/0.7)]"
            style={{ background: "radial-gradient(ellipse at 50% 40%, #6b111a, #3a060b 75%)" }}
          >
            <div className="h-full w-full rounded-[50%] border border-dashed border-gold/35" />
          </div>
        </div>

        {coins.length === 0 && (
          <p className="absolute inset-x-0 bottom-7 text-center font-serif text-xs text-paper/55 italic">
            Empty tonight
          </p>
        )}
        {coins.map((id) => (
          <FloatingCoin
            key={id}
            id={id}
            at={COIN_SPOTS[id % COIN_SPOTS.length]}
            enabled={enabled}
            slotRef={slotRef}
            onInsert={onInsert}
            onHint={onHint}
          />
        ))}
      </div>
      <p className="font-slab text-[8px] tracking-[0.25em] text-gold-light/80 uppercase">
        Tonight&apos;s Coins · {coins.length}
      </p>
    </div>
  );
}

function FloatingCoin({
  id,
  at,
  enabled,
  slotRef,
  onInsert,
  onHint,
}: {
  id: number;
  at: { x: number; y: number };
  enabled: boolean;
  slotRef: React.RefObject<HTMLElement | null>;
  onInsert: (id: number) => void;
  onHint: (hint: SlotHint) => void;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [lifted, setLifted] = React.useState(false); // picked up or in flight
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const opacity = useMotionValue(1);
  const draggedRef = React.useRef(false);
  const [flying, setFlying] = React.useState(false);

  // Is the pointer over (or close to) the slot? info.point is in page
  // coordinates; the slot's rect is in the viewport's.
  const overSlot = (info: PanInfo) => {
    const slot = slotRef.current?.getBoundingClientRect();
    if (!slot) return false;
    const px = info.point.x - window.scrollX;
    const py = info.point.y - window.scrollY;
    const near = 28;
    return (
      px > slot.left - near && px < slot.right + near && py > slot.top - near && py < slot.bottom + near
    );
  };

  // Toss the coin into the slot from wherever it is now, then drop it in.
  const flyIn = async () => {
    const slot = slotRef.current?.getBoundingClientRect();
    const me = ref.current?.getBoundingClientRect();
    if (!slot || !me) return;
    setFlying(true);
    onHint("over");
    const dx = slot.left + slot.width / 2 - (me.left + me.width / 2);
    const dy = slot.top + slot.height / 2 - (me.top + me.height / 2);
    const x0 = x.get();
    const y0 = y.get();
    await Promise.all([
      animate(x, x0 + dx, { duration: 0.5, ease: [0.3, 0, 0.3, 1] }),
      animate(y, [y0, y0 + dy - 60, y0 + dy], { duration: 0.5, times: [0, 0.45, 1], ease: "easeInOut" }),
    ]);
    // Turn edge-on and slip through the slit.
    await Promise.all([
      animate(scaleX, 0.12, { duration: 0.12 }),
      animate(y, y.get() + 10, { duration: 0.2, ease: "easeIn" }),
      animate(opacity, 0, { duration: 0.2, delay: 0.05 }),
    ]);
    onHint("idle");
    onInsert(id);
  };

  return (
    <>
      {/* Its shadow on the tray, breathing with the bob */}
      {!lifted && !flying && (
        <span
          aria-hidden
          className="pointer-events-none absolute h-2.5 w-9 animate-[coin-shadow_2.4s_ease-in-out_infinite] rounded-[50%] bg-black/55 blur-[2px]"
          style={{
            left: `calc(50% + ${at.x}px - 18px)`,
            top: `calc(100% - 44px + ${at.y * 0.35}px)`,
            animationDelay: `${id * 0.55}s`,
          }}
        />
      )}
      <motion.button
        ref={ref}
        type="button"
        aria-label="Insert this coin"
        title="Drop me in the slot"
        disabled={!enabled || flying}
        className={cn(
          "absolute -mt-[22px] -ml-[22px] touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gold-light",
          enabled && !flying ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-60"
        )}
        style={{ x, y, scaleX, opacity, left: `calc(50% + ${at.x}px)`, top: `calc(50% + ${at.y}px)` }}
        drag={enabled && !flying}
        dragMomentum={false}
        dragElastic={0}
        whileHover={enabled && !flying ? { scale: 1.12 } : undefined}
        onPointerDown={() => {
          draggedRef.current = false;
        }}
        onHoverStart={() => {
          if (enabled && !flying) onHint("near");
        }}
        onHoverEnd={() => {
          if (!lifted && !flying) onHint("idle");
        }}
        onDragStart={() => {
          draggedRef.current = true;
          setLifted(true);
          onHint("near");
        }}
        onDrag={(_, info) => onHint(overSlot(info) ? "over" : "near")}
        onDragEnd={(_, info) => {
          if (overSlot(info)) {
            void flyIn();
          } else {
            onHint("idle");
            animate(x, 0, { type: "spring", stiffness: 300, damping: 22 });
            animate(y, 0, { type: "spring", stiffness: 300, damping: 22 }).then(() => setLifted(false));
          }
        }}
        onClick={() => {
          if (!draggedRef.current) void flyIn();
        }}
      >
        {/* Pops in when the coin first appears, or comes back via Coin Return */}
        <motion.span
          className="block"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
        >
          <Coin delay={id * 0.55} />
        </motion.span>
      </motion.button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Coin slot
// ---------------------------------------------------------------------------

// The brass coin slot. It glows softly when you pick up a coin, lights up
// bright with "Drop It!" when the coin is right over it, and holds a steady
// glow once a coin is in, when pressing it works the coin return.
export const CoinSlot = React.forwardRef<
  HTMLButtonElement,
  { credited: boolean; hint: SlotHint; onReturn: () => void; canReturn: boolean }
>(function CoinSlot({ credited, hint, onReturn, canReturn }, ref) {
  const over = !credited && hint === "over";
  const near = !credited && hint === "near";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onReturn}
      disabled={!credited || !canReturn}
      aria-label={credited ? "Coin inserted. Press to return it" : "Coin slot: insert a coin"}
      title={credited ? "Coin return" : "Insert a coin"}
      className={cn(
        "flex w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-[#7a5512] px-1 py-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_2px_4px_rgb(0_0_0/0.5)] outline-none transition-[filter,transform,box-shadow] duration-200 enabled:cursor-pointer enabled:hover:brightness-110 focus-visible:ring-2 focus-visible:ring-gold-light disabled:cursor-default",
        over && "scale-110 brightness-125 shadow-[0_0_18px_4px_rgb(252_211_77/0.55)]",
        near && "brightness-110"
      )}
      style={{ background: "linear-gradient(180deg, #f6dc8c, #c99a2e 55%, #8a6417)" }}
    >
      <span
        className={cn(
          "block h-6 w-1.5 rounded-full transition-[background-color,box-shadow] duration-200",
          credited || over
            ? "bg-amber-200 shadow-[0_0_12px_4px_rgb(252_211_77/0.85)]"
            : near
              ? "animate-pulse bg-amber-500/80 shadow-[0_0_8px_2px_rgb(252_211_77/0.5)]"
              : "bg-[#1a1206] shadow-[inset_0_1px_2px_rgb(0_0_0/0.9)]"
        )}
      />
      <span className="font-slab text-[6px] leading-none tracking-[0.1em] whitespace-nowrap text-[#2a1d08] uppercase">
        {credited ? "Credit 1" : over ? "Drop It!" : "Insert Coin"}
      </span>
    </button>
  );
});

// ---------------------------------------------------------------------------
// Lever
// ---------------------------------------------------------------------------

const ARM = 92; // arm length, pivot to knob centre
const PERSPECTIVE = 420;

// A one-armed bandit's lever, seen from the front: a chrome arm on a pivot
// hub, knob up at rest. Pulling swings the arm toward you and down until it
// hangs below the pivot. `theta` is the swing in degrees (0 = up, 180 =
// down); the parent animates it for a spin. Dragging the knob down sets it
// directly, and only a pull all the way down counts.
export function Lever({
  theta,
  enabled,
  onPull,
}: {
  theta: MotionValue<number>;
  enabled: boolean;
  onPull: () => void;
}) {
  // Project the swing: the knob's height on screen, and how much nearer
  // (larger) it looks as the arm swings out toward you.
  const nearness = useTransform(
    theta,
    (t) => PERSPECTIVE / (PERSPECTIVE - ARM * Math.sin((t * Math.PI) / 180))
  );
  const knobY = useTransform(theta, (t) => {
    const r = (t * Math.PI) / 180;
    return -ARM * Math.cos(r) * (PERSPECTIVE / (PERSPECTIVE - ARM * Math.sin(r)));
  });
  const armTop = useTransform(knobY, (ky) => Math.min(0, ky));
  const armHeight = useTransform(knobY, (ky) => Math.abs(ky));
  const armWidth = useTransform(nearness, (s) => 7 * (1 + (s - 1) * 0.7));

  const panFrom = React.useRef(0);
  const pannedRef = React.useRef(false);

  return (
    // Hangs just off the cabinet's right edge (the bracket overlaps it).
    <div className="absolute top-[46%] left-full h-0 w-10">
      {/* Bracket fixing the pivot to the cabinet */}
      <span
        aria-hidden
        className="absolute -top-2.5 -left-3 h-5 w-8 rounded-sm bg-gradient-to-b from-[#d8d8de] via-[#8e8e96] to-[#4a4a52] shadow-md"
      />
      {/* The arm */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8e8e96] via-[#f4f4f7] to-[#7a7a82] shadow-[0_2px_4px_rgb(0_0_0/0.5)]"
        style={{ top: armTop, height: armHeight, width: armWidth }}
      />
      {/* Pivot hub */}
      <span
        aria-hidden
        className="absolute top-0 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#c99a2e] bg-[radial-gradient(circle_at_35%_30%,#ffffff,#b5b5bd_45%,#4a4a52)] shadow-md"
      />
      {/* The knob: drag it down, or click it */}
      <motion.button
        type="button"
        aria-label="Pull the lever to spin"
        title={enabled ? "Pull the lever all the way down" : "Insert a coin first"}
        disabled={!enabled}
        className={cn(
          "absolute top-0 left-1/2 -mt-[15px] -ml-[15px] size-[30px] touch-none rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff9a9a,#e11d2e_55%,#6e0a12)] shadow-[0_4px_8px_rgb(0_0_0/0.55)] outline-none focus-visible:ring-2 focus-visible:ring-gold-light",
          enabled ? "cursor-grab hover:brightness-110 active:cursor-grabbing" : "cursor-not-allowed saturate-50"
        )}
        style={{ y: knobY, scale: nearness }}
        onPointerDown={() => {
          pannedRef.current = false;
        }}
        onPanStart={() => {
          if (!enabled) return;
          pannedRef.current = true;
          theta.stop();
          panFrom.current = theta.get();
        }}
        onPan={(_, info) => {
          if (!enabled) return;
          // The knob travels about twice the arm's length from top to bottom.
          const t = panFrom.current + (info.offset.y / (ARM * 2)) * 180;
          theta.set(Math.max(0, Math.min(180, t)));
        }}
        onPanEnd={() => {
          if (!enabled) return;
          if (theta.get() >= 160) onPull();
          else animate(theta, 0, { type: "spring", stiffness: 260, damping: 16 });
        }}
        onClick={() => {
          if (enabled && !pannedRef.current) onPull();
        }}
      />
    </div>
  );
}
