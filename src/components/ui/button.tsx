import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-lime-400 text-black hover:bg-lime-300 focus-visible:ring-lime-400",
        violet:
          "bg-violet-500 text-white hover:bg-violet-400 focus-visible:ring-violet-500",
        outline:
          "border border-white/20 bg-white/5 text-white hover:bg-white/10",
        ghost: "text-white hover:bg-white/10",
        destructive: "bg-red-500 text-white hover:bg-red-400",
        glass:
          "border border-white/10 bg-white/5 backdrop-blur-xl text-white hover:bg-white/10",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
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
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
