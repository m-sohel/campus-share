import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-celadon-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-celadon-700 text-white hover:bg-celadon-800 shadow-xs active:bg-celadon-900",
        destructive:
          "bg-rose-700 text-white hover:bg-rose-800 shadow-xs active:bg-rose-900",
        outline:
          "border border-dusty-olive-300 bg-white hover:bg-dusty-olive-50 text-dusty-olive-900 active:bg-dusty-olive-100",
        secondary:
          "bg-soft-celadon-100 text-soft-celadon-900 hover:bg-soft-celadon-200 border border-soft-celadon-200 active:bg-soft-celadon-300",
        ghost:
          "hover:bg-soft-celadon-50 hover:text-soft-celadon-900 text-dusty-olive-800",
        link:
          "text-celadon-800 underline-offset-4 hover:underline hover:text-celadon-900",
        accent:
          "bg-tea-green-300 text-tea-green-950 hover:bg-tea-green-400 font-semibold shadow-xs border border-tea-green-400",
        teal:
          "bg-muted-teal-700 text-white hover:bg-muted-teal-800 shadow-xs active:bg-muted-teal-900",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs sm:text-sm",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-sm sm:text-base font-semibold",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(buttonVariants({ variant, size, className }), child.props.className),
        ...props,
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
