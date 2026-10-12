import type { Metadata } from "next";
import { IM_Fell_English, IM_Fell_English_SC, Rye } from "next/font/google";
import "./globals.css";

import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { StageCurtains } from "@/components/stage-curtains";
import { WelcomeDialog } from "@/components/welcome-dialog";

// The type set (see globals.css for how each is used): Rye woodtype for signage.
const rye = Rye({ variable: "--font-rye", subsets: ["latin"], weight: "400" });
// IM Fell: recut from 17th-century printing type, uneven ink and all. It's
// the face for everything but the Rye woodtype signage, and has one weight:
// keep font-bold off it, or the browser smears in a fake bold.
const fell = IM_Fell_English({
  variable: "--font-im-fell",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});
const fellSc = IM_Fell_English_SC({ variable: "--font-im-fell-sc", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: {
    default: "Reel Roulette — Spin for Your Next Movie",
    template: "%s · Reel Roulette",
  },
  description:
    "Can't decide what to watch? Swipe through a roulette of movies, reroll until something clicks, and build a Watch Deck along the way.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${rye.variable} ${fell.variable} ${fellSc.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* The stage: the curtains hang from under the nav to the foot of the
            page. Nothing may make the page wider than the window (overflow-x
            clip, which unlike hidden keeps the sticky nav working). */}
        <div className="relative flex flex-1 flex-col overflow-x-clip">
          <SiteNav />
          <StageCurtains />
          {/* `isolate` gives the page its own stacking context, so no z-index
              inside it (e.g. the hovered card in the Watch Deck hand) can
              rise above the curtains. */}
          <main className="isolate flex-1 pt-3">{children}</main>
          <SiteFooter />
        </div>
        <WelcomeDialog />
      </body>
    </html>
  );
}
