import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3", {
  variants: {
    variant: {
      default: "bg-primary/15 text-primary",
      success: "bg-success/15 text-success",
      destructive: "bg-destructive/15 text-destructive",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "border border-border text-muted-foreground",
      warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
