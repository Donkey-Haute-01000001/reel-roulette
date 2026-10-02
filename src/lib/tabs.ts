// The site's three tabs, in order. The nav lists them; the curtain tie-backs
// step through them left / right (wrapping around).
export const TABS = [
  { href: "/", label: "Swipe" },
  { href: "/watchlist", label: "Watch Deck" },
  { href: "/roulette", label: "Spin" },
] as const;

export function tabIndex(pathname: string): number {
  const i = TABS.findIndex((t) => t.href === pathname);
  return i === -1 ? 0 : i;
}
