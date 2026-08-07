import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

// Composite score bands: >=8 hot, >=5 warm, else cool. Matches the 0-10
// composite scale from lib/scoring/composite-score.ts.
export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const band =
    score >= 8
      ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
      : score >= 5
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={cn("border-transparent font-semibold tabular-nums", band, className)}>
      {score.toFixed(1)}
    </Badge>
  );
}
