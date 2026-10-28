import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 sm:h-10 w-full rounded-lg border border-dusty-olive-300 bg-white px-3 py-2 text-xs sm:text-sm text-dusty-olive-950 placeholder:text-dusty-olive-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-celadon-600 focus-visible:border-celadon-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
