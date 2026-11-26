import { getRetailer } from "@/features/retailers/retailers";
import { cn } from "@/lib/utils";

/** Brand-coloured monogram badge for a retailer (no trademarked artwork shipped). */
export function RetailerLogo({ retailer, size = "md", showName = false, className }: { retailer: string; size?: "sm" | "md" | "lg"; showName?: boolean; className?: string }) {
  const r = getRetailer(retailer);
  if (!r) return null;
  const dims = { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-11 text-sm" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn("grid shrink-0 place-items-center rounded-lg font-display font-extrabold shadow-sm ring-1 ring-black/5", dims)}
        style={{ backgroundColor: r.color, color: r.text }}
        aria-hidden={showName}
        title={r.name}
        role={showName ? undefined : "img"}
        aria-label={showName ? undefined : r.name}
      >
        {r.mono}
      </span>
      {showName && <span className="text-sm font-semibold">{r.name}</span>}
    </span>
  );
}
