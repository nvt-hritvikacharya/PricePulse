import { cn, discountPercent, formatINR } from "@/lib/utils";

export function Price({ price, mrp, size = "md", className }: { price: number | null; mrp?: number | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const off = price ? discountPercent(price, mrp) : 0;
  const text = { sm: "text-base", md: "text-xl", lg: "text-3xl" }[size];
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-display font-extrabold tracking-tight", text)}>{formatINR(price)}</span>
      {off > 0 && (
        <>
          <span className="text-sm text-muted-foreground line-through">{formatINR(mrp)}</span>
          <span className="text-sm font-bold text-success">{off}% off</span>
        </>
      )}
    </div>
  );
}
