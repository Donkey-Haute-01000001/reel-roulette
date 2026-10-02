import type { Metadata } from "next";
import { Abril_Fatface, Holtwood_One_SC, Old_Standard_TT, Rye } from "next/font/google";
import "./globals.css";

import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { StageCurtains } from "@/components/stage-curtains";

// Victorian broadside woodtype set (see globals.css for how each is used).
const fatface = Abril_Fatface({ variable: "--font-fatface", subsets: ["latin"], weight: "400" });
const rye = Rye({ variable: "--font-rye", subsets: ["latin"], weight: "400" });
const holtwood = Holtwood_One_SC({ variable: "--font-holtwood", subsets: ["latin"], weight: "400" });
const oldStandard = Old_Standard_TT({
  variable: "--font-old-standard",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

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
      className={`dark ${fatface.variable} ${rye.variable} ${holtwood.variable} ${oldStandard.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* The stage: the curtains hang from under the nav to the foot of the
            page. Nothing may make the page wider than the window (overflow-x
            clip, which unlike hidden keeps the sticky nav working). */}
        <div className="relative flex flex-1 flex-col overflow-x-clip">
          <SiteNav />
          <StageCurtains />
          {/* Top padding clears the valance */}
          <main className="flex-1 pt-10">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
