import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-white/10 text-white border-white/20",
  lime: "bg-lime-400/20 text-lime-300 border-lime-400/30",
  violet: "bg-violet-500/20 text-violet-300 border-violet-400/30",
  cyan: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30",
  red: "bg-red-500/20 text-red-300 border-red-400/30",
  yellow: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof badgeVariants;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
