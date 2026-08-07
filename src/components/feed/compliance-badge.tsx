import { Badge } from "@/components/ui/badge";
import type { ComplianceVerdict } from "@/lib/mock/feed-data";
import { cn } from "@/lib/utils";

const VERDICT_STYLES: Record<ComplianceVerdict, { label: string; className: string }> = {
  safe: { label: "Safe", className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400" },
  caution: { label: "Caution", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  blocked: { label: "Blocked", className: "bg-red-600/15 text-red-700 dark:text-red-400" },
};

interface ComplianceBadgeProps {
  verdict: ComplianceVerdict;
  className?: string;
}

export function ComplianceBadge({ verdict, className }: ComplianceBadgeProps) {
  const style = VERDICT_STYLES[verdict];
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}
