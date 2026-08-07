import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ComplianceBadge } from "./compliance-badge";
import { CopyDraftButton } from "./copy-draft-button";
import type { MockDraft } from "@/lib/mock/feed-data";

interface DraftVariantCardProps {
  draft: MockDraft;
  permalink: string;
}

export function DraftVariantCard({ draft, permalink }: DraftVariantCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <ComplianceBadge verdict={draft.complianceVerdict} />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.body}</p>
        <p className="text-xs text-muted-foreground">{draft.complianceNotes}</p>
      </CardContent>
      <CardFooter>
        <CopyDraftButton text={draft.body} permalink={permalink} />
      </CardFooter>
    </Card>
  );
}
