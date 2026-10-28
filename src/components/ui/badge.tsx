import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-soft-celadon-200 bg-soft-celadon-100 text-soft-celadon-900",
        secondary:
          "border-dusty-olive-200 bg-dusty-olive-100 text-dusty-olive-900",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-800",
        outline:
          "text-dusty-olive-900 border-dusty-olive-300 bg-white/80",
        success:
          "border-celadon-200 bg-celadon-100 text-celadon-900",
        warning:
          "border-amber-200 bg-amber-50 text-amber-900",
        accent:
          "border-tea-green-300 bg-tea-green-100 text-tea-green-950 font-bold",
        teal:
          "border-muted-teal-200 bg-muted-teal-100 text-muted-teal-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
