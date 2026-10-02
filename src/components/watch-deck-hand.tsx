"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import type { Movie } from "@/lib/types";
import { MovieCard } from "@/components/movie-card";

// Cards are 120px wide in a small hand and shrink (down to 88px) as the hand
// grows, so a big hand still fits with room for the hovered card.
const MAX_CARD_W = 110;
const MIN_CARD_W = 84;
const MAX_SPREAD = 84; // px between card centres when there's room
const LIFT = 56; // how far the hovered card rises out of the hand
const HOVER_SCALE = 1.45;
const PLAY_THRESHOLD = 110; // drag a card this far up to play it
const SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 } as const;

// The Watch Deck as a card-game hand (Hearthstone / Slay the Spire): cards
// fanned in an arc along the bottom, the one under the pointer lifts, grows
// and straightens while its neighbours slide out of the way. Click a card,
// or drag it up out of the hand, to play it to the table.
export function WatchDeckHand({
  movies,
  onPlay,
}: {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  // Set once a drag starts, so the click that ends it doesn't also play.
  const draggedRef = React.useRef(false);
  // The hand's on-screen box, measured once per hover (on pointer enter)
  // rather than on every pointer move — reading layout on each move while
  // the cards animate forces the browser to recalculate layout every frame.
  const rectRef = React.useRef<DOMRect | null>(null);

  // The hovered card tilts toward the pointer.
  const tiltX = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });
  const tiltY = useSpring(useMotionValue(0), { stiffness: 300, damping: 25 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = movies.length;
  const CARD_W = Math.round(Math.max(MIN_CARD_W, MAX_CARD_W - Math.max(0, n - 8) * 2.5));
  const CARD_H = CARD_W * 1.4;
  const tilt = Math.min(5, 36 / Math.max(n, 1));
  const half = (n - 1) / 2;
  const arc = half > 0 ? 26 / (half * half) : 0; // edge cards sit ~26px lower
  // How far a card reaches sideways from its centre line once tilted by
  // `deg` about its bottom edge (its top outer corner swings outward).
  const reach = (deg: number) => {
    const r = (Math.abs(deg) * Math.PI) / 180;
    return (CARD_W / 2) * Math.cos(r) + CARD_H * Math.sin(r);
  };
  const edgeTilt = half * tilt;
  // Squeeze the cards together as the hand grows, so the whole fan — tilted
  // outer cards included, every corner — always fits inside the hand.
  const spread =
    n > 1
      ? Math.max(8, Math.min(MAX_SPREAD, ((width || 800) / 2 - 6 - reach(edgeTilt)) / half))
      : 0;
  // Enough to uncover the neighbours of the enlarged card.
  const push = Math.max(18, (CARD_W * HOVER_SCALE) / 2 + 8 - spread);

  // Clamped: the hovered card may have just been played out of the hand.
  const rawActive = dragIndex ?? hoverIndex;
  const active = rawActive === null || n === 0 ? null : Math.min(rawActive, n - 1);
  // Room below the cards for the outer ones, which sit lower on the arc and
  // dip a bottom corner as they tilt.
  const drop = 26 + (CARD_W / 2) * Math.sin((edgeTilt * Math.PI) / 180);
  const baseline = Math.ceil(drop) + 8;
  // Just tall enough for the resting hand: the hovered card rises out of it,
  // over the bottom of the table, like a hand in Hearthstone.
  const height = CARD_H + baseline + 20;

  const measure = () => {
    rectRef.current = containerRef.current?.getBoundingClientRect() ?? null;
    return rectRef.current;
  };

  // Which card the pointer is over, with a little hysteresis: the hovered
  // card keeps the hover until the pointer is clearly over a neighbour, so
  // it doesn't flicker back and forth on the boundary between two cards.
  const indexAt = (clientX: number, rect: DOMRect) => {
    if (n <= 1 || spread === 0) return 0;
    const pos = (clientX - rect.left - rect.width / 2) / spread + half;
    if (hoverIndex !== null && hoverIndex < n && Math.abs(pos - hoverIndex) < 0.75) {
      return hoverIndex;
    }
    return Math.min(n - 1, Math.max(0, Math.round(pos)));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragIndex !== null || n === 0) return;
    const rect = rectRef.current ?? measure();
    if (!rect) return;
    const i = indexAt(e.clientX, rect);
    if (i !== hoverIndex) setHoverIndex(i);

    const cardCenterX = rect.left + rect.width / 2 + (i - half) * spread;
    const cardCenterY = rect.top + height - baseline - CARD_H / 2 - LIFT;
    const dx = Math.max(-1, Math.min(1, (e.clientX - cardCenterX) / (CARD_W / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - cardCenterY) / (CARD_H / 2)));
    tiltY.set(dx * 12);
    tiltX.set(-dy * 10);
  };

  const step = (delta: number) => {
    if (n === 0) return;
    setHoverIndex((h) => Math.min(n - 1, Math.max(0, (h ?? Math.floor(half)) + delta)));
  };

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Your hand"
      tabIndex={0}
      className="relative w-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ height }}
      onPointerEnter={measure}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        rectRef.current = null;
        if (dragIndex === null) setHoverIndex(null);
        tiltX.set(0);
        tiltY.set(0);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        else if (e.key === "ArrowLeft") step(-1);
        else if ((e.key === "Enter" || e.key === " ") && hoverIndex !== null) {
          e.preventDefault();
          onPlay(movies[hoverIndex]);
        }
      }}
    >
      {movies.map((movie, i) => {
        const t = i - half;
        const isActive = i === active;
        const isDragging = i === dragIndex;

        let x = t * spread;
        let y = t * t * arc;
        let rotate = t * tilt;
        let scale = 1;
        if (isActive) {
          y = -LIFT;
          rotate = 0;
          // Back to 1:1 while dragging so the card tracks the pointer exactly.
          scale = isDragging ? 1 : HOVER_SCALE;
        } else if (active !== null) {
          const dist = Math.abs(i - active);
          x += Math.sign(i - active) * push * Math.max(0, 1 - (dist - 1) * 0.45);
        }
        // Never let a card (tilted, pushed aside, or the enlarged hovered
        // one) reach past the sides of the hand.
        if (width > 0) {
          const extent = rotate === 0 ? (CARD_W * scale) / 2 : reach(rotate);
          const edge = Math.max(0, width / 2 - extent - 4);
          x = Math.max(-edge, Math.min(edge, x));
        }

        return (
          <motion.div
            key={movie.id}
            role="option"
            aria-selected={isActive}
            aria-label={movie.title}
            className="absolute"
            style={{
              left: "50%",
              bottom: baseline,
              marginLeft: -CARD_W / 2,
              width: CARD_W,
              transformOrigin: "50% 100%",
              zIndex: isActive ? 1000 : i,
              willChange: "transform",
            }}
            initial={{ y: 200, opacity: 0 }}
            animate={{ x, y, rotate, scale, opacity: 1 }}
            transition={SPRING}
          >
            <motion.div
              className="cursor-grab active:cursor-grabbing"
              drag
              dragSnapToOrigin
              dragElastic={0.6}
              onPointerDown={() => {
                draggedRef.current = false;
              }}
              onDragStart={() => {
                draggedRef.current = true;
                setDragIndex(i);
                tiltX.set(0);
                tiltY.set(0);
              }}
              onDragEnd={(_, info) => {
                setDragIndex(null);
                if (info.offset.y < -PLAY_THRESHOLD) onPlay(movie);
              }}
              onClick={() => {
                if (!draggedRef.current) onPlay(movie);
              }}
            >
              <motion.div
                style={
                  isActive && !isDragging
                    ? { rotateX: tiltX, rotateY: tiltY, transformPerspective: 700 }
                    : undefined
                }
              >
                <MovieCard
                  movie={movie}
                  className={isActive ? "shadow-2xl shadow-black/60" : "shadow-lg shadow-black/40"}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
