import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MockSubredditRules } from "@/lib/mock/feed-data";

function flag(label: string, value: boolean | null) {
  const text = value === null ? "Unknown" : value ? "Allowed" : "Not allowed";
  const className =
    value === null
      ? "bg-muted text-muted-foreground"
      : value
        ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
        : "bg-red-600/15 text-red-700 dark:text-red-400";
  return (
    <div key={label} className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline" className={`border-transparent font-medium ${className}`}>
        {text}
      </Badge>
    </div>
  );
}

interface SubredditRulesCardProps {
  rules: MockSubredditRules;
}

export function SubredditRulesCard({ rules }: SubredditRulesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Subreddit rules digest</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {flag("Self-promotion", rules.allowsPromo)}
          {flag("Links", rules.allowsLinks)}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Min. account age</span>
            <span>{rules.minAccountAgeDays ? `${rules.minAccountAgeDays} days` : "Unknown"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Min. karma</span>
            <span>{rules.minKarma ?? "Unknown"}</span>
          </div>
        </div>
        {rules.rawRulesText.length > 0 && (
          <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
            {rules.rawRulesText.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
