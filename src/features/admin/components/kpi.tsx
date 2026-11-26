import type { LucideIcon } from "lucide-react";

export function Kpi({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
