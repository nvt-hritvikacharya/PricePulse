import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Marks data that came from the mock provider. Always shown next to demo prices. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={className} title="Illustrative data from the mock provider. Add API keys to see live prices.">
      <FlaskConical aria-hidden /> Demo data
    </Badge>
  );
}
