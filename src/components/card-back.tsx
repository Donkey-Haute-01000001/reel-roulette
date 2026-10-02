import * as React from "react";
import { Clapperboard } from "lucide-react";

import { cn } from "@/lib/utils";

// The back of a Reel Roulette card: aged cream margin, crimson field with a gold
// lattice, and a gold medallion in the middle. Same 5:7 shape and
// container-unit sizing as MovieCard, so the two can sit back to back.
export const CardBack = React.memo(function CardBack({ className }: { className?: string }) {
  return (
    <div className="@container w-full select-none">
      <div
        className={cn(
          "card-stock relative aspect-[5/7] w-full overflow-hidden rounded-[6cqw] border border-[#d3c39f] p-[5cqw]",
          className
        )}
      >
        <div
          className="flex h-full w-full items-center justify-center rounded-[3.5cqw]"
          style={{
            backgroundColor: "#8f171b",
            backgroundImage: [
              "repeating-linear-gradient(45deg, rgb(241 210 122 / 0.38) 0 0.6cqw, transparent 0.6cqw 7cqw)",
              "repeating-linear-gradient(-45deg, rgb(241 210 122 / 0.38) 0 0.6cqw, transparent 0.6cqw 7cqw)",
              "radial-gradient(ellipse at center, #b52328, #6e1014)",
            ].join(", "),
            boxShadow: "inset 0 0 0 1.4cqw #8f171b, inset 0 0 0 2.2cqw #d4a531",
          }}
        >
          <div className="flex size-[40cqw] items-center justify-center rounded-full border-[1.6cqw] border-[#d4a531] bg-[#6e1014] shadow-[0_0_0_1.2cqw_#8f171b]">
            <Clapperboard className="size-[20cqw] text-[#f1d27a]" strokeWidth={1.75} />
          </div>
        </div>
      </div>
    </div>
  );
});
