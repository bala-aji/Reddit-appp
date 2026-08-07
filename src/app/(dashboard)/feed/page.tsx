import { mockOpportunities } from "@/lib/mock/feed-data";
import { OpportunityCard } from "@/components/feed/opportunity-card";

export default function FeedPage() {
  const now = new Date();
  const sorted = [...mockOpportunities].sort((a, b) => b.compositeScore - a.compositeScore);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Feed</h1>
        <p className="text-sm text-muted-foreground">
          Sorted by composite score. Backed by mock data — not yet wired to a live Reddit ingestion pipeline.
        </p>
      </div>
      <div className="space-y-3">
        {sorted.map((opportunity) => (
          <OpportunityCard key={opportunity.id} opportunity={opportunity} now={now} />
        ))}
      </div>
    </div>
  );
}
