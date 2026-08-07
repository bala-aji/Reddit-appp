import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "@/components/feed/score-badge";
import { SubredditRulesCard } from "@/components/feed/subreddit-rules-card";
import { DraftVariantCard } from "@/components/feed/draft-variant-card";
import { getMockOpportunity, mockOpportunities } from "@/lib/mock/feed-data";

export function generateStaticParams() {
  return mockOpportunities.map((o) => ({ id: o.id }));
}

const VARIANT_LABELS = { helpful: "Helpful", peer: "Peer", expert: "Expert" } as const;

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = getMockOpportunity(id);
  if (!opportunity) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to feed
      </Link>

      <div className="grid gap-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">r/{opportunity.post.subreddit}</span>
                  <span>·</span>
                  <span>u/{opportunity.post.author}</span>
                  <span>·</span>
                  <span>
                    {opportunity.post.score} upvotes · {opportunity.post.numComments} comments
                  </span>
                </div>
                <CardTitle className="text-base leading-snug">{opportunity.post.title}</CardTitle>
              </div>
              <ScoreBadge score={opportunity.compositeScore} className="shrink-0" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{opportunity.post.body}</p>
              <a
                href={opportunity.post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Open on Reddit
                <ExternalLink className="size-3.5" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Why it matched</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{opportunity.reason}</p>
              <dl className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Intent</dt>
                  <dd className="font-semibold tabular-nums">{opportunity.intentScore.toFixed(1)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Citation</dt>
                  <dd className="font-semibold tabular-nums">{opportunity.citationScore.toFixed(1)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Freshness/reach</dt>
                  <dd className="font-semibold tabular-nums">{opportunity.freshnessReachScore.toFixed(1)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Drafts</h2>
            <Tabs defaultValue={opportunity.drafts[0]?.variant}>
              <TabsList>
                {opportunity.drafts.map((draft) => (
                  <TabsTrigger key={draft.id} value={draft.variant}>
                    {VARIANT_LABELS[draft.variant]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {opportunity.drafts.map((draft) => (
                <TabsContent key={draft.id} value={draft.variant}>
                  <DraftVariantCard draft={draft} permalink={opportunity.post.permalink} />
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>

        <div className="space-y-6">
          <SubredditRulesCard rules={opportunity.subredditRules} />
        </div>
      </div>
    </div>
  );
}
