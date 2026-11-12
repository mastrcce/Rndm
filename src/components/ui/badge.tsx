import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3", {
  variants: {
    variant: {
      default: "bg-sage-100 text-forest-900",
      solid: "bg-forest-800 text-cream-50",
      outline: "border border-line text-muted bg-white",
      warn: "bg-warn-bg text-warn-fg",
      success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
