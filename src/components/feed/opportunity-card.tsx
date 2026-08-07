import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "./score-badge";
import type { MockOpportunity } from "@/lib/mock/feed-data";

function timeAgo(iso: string, now: Date): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface OpportunityCardProps {
  opportunity: MockOpportunity;
  now: Date;
}

export function OpportunityCard({ opportunity, now }: OpportunityCardProps) {
  return (
    <Link href={`/feed/${opportunity.id}`} className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">r/{opportunity.post.subreddit}</span>
              <span>·</span>
              <span>{timeAgo(opportunity.post.createdUtc, now)}</span>
              <span>·</span>
              <span>{opportunity.post.numComments} comments</span>
            </div>
            <h3 className="truncate text-sm font-semibold leading-tight">{opportunity.post.title}</h3>
          </div>
          <ScoreBadge score={opportunity.compositeScore} className="shrink-0" />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{opportunity.reason}</p>
          <div className="flex flex-wrap gap-1.5">
            {opportunity.matchedSignals.map((signal) => (
              <Badge key={signal} variant="secondary" className="font-normal">
                {signal}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
