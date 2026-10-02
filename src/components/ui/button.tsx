import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Broadside "tickets": squared-off, extended woodtype caps. Primary is deep
// red with a gold edge; secondary is cream paper with an ink edge.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[3px] font-slab text-[11px] uppercase tracking-[0.12em] transition-[filter,background-color,color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border border-gold/80 bg-crimson text-paper shadow-[inset_0_0_0_2px_rgb(0_0_0/0.22),0_2px_0_rgb(0_0_0/0.35)] hover:brightness-115",
        destructive: "border border-gold/60 bg-destructive text-destructive-foreground hover:brightness-110",
        outline: "border border-gold/60 bg-transparent text-paper hover:bg-gold/10",
        secondary:
          "border border-ink/70 bg-paper text-ink shadow-[0_2px_0_rgb(0_0_0/0.3)] hover:bg-paper-deep",
        ghost: "text-paper hover:bg-gold/10",
        link: "text-gold-light underline-offset-4 hover:underline normal-case font-serif tracking-normal",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[10px]",
        lg: "h-12 px-7 text-sm",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
