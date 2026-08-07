// Mock data for the feed/opportunity-detail UI. Not wired to Supabase yet —
// auth, server actions, and real queries are a separate integration pass.
// Shapes intentionally mirror src/db/schema.ts so swapping in a real query
// later is a data-source change, not a component rewrite.

export type OpportunityStatus = "new" | "saved" | "drafted" | "posted" | "dismissed";
export type ComplianceVerdict = "safe" | "caution" | "blocked";
export type DraftVariant = "helpful" | "peer" | "expert";

export interface MockDraft {
  id: string;
  variant: DraftVariant;
  body: string;
  complianceVerdict: ComplianceVerdict;
  complianceNotes: string;
}

export interface MockSubredditRules {
  allowsPromo: boolean | null;
  allowsLinks: boolean | null;
  minAccountAgeDays: number | null;
  minKarma: number | null;
  rawRulesText: string[];
}

export interface MockPost {
  subreddit: string;
  title: string;
  body: string;
  author: string;
  permalink: string;
  createdUtc: string;
  score: number;
  numComments: number;
}

export interface MockOpportunity {
  id: string;
  status: OpportunityStatus;
  compositeScore: number;
  intentScore: number;
  citationScore: number;
  freshnessReachScore: number;
  reason: string;
  matchedSignals: string[];
  post: MockPost;
  subredditRules: MockSubredditRules;
  drafts: MockDraft[];
}

export const mockOpportunities: MockOpportunity[] = [
  {
    id: "opp-1",
    status: "new",
    compositeScore: 9.1,
    intentScore: 9,
    citationScore: 10,
    freshnessReachScore: 7.2,
    reason: "Directly compares Reddit monitoring tools and asks for a recommendation.",
    matchedSignals: ["\"alternatives to\" phrasing", "comparison thread", "high comment velocity"],
    post: {
      subreddit: "SaaS",
      title: "GummySearch vs RedditGrow vs OctoLens — which one actually works?",
      body: "Comparing a few Reddit monitoring tools before I commit to a subscription. Curious which one people have actually stuck with past month one.",
      author: "growth_marketer_99",
      permalink: "https://reddit.com/r/SaaS/comments/mock1",
      createdUtc: "2026-08-06T20:30:00Z",
      score: 76,
      numComments: 33,
    },
    subredditRules: {
      allowsPromo: false,
      allowsLinks: true,
      minAccountAgeDays: 30,
      minKarma: 50,
      rawRulesText: [
        "No self-promotion or advertising outside of designated threads.",
        "Links must be relevant to the discussion, not primarily promotional.",
      ],
    },
    drafts: [
      {
        id: "draft-1a",
        variant: "helpful",
        complianceVerdict: "safe",
        complianceNotes: "No product mention — subreddit prohibits self-promotion.",
        body: "We ran into the same wall comparing these. GummySearch is strong on subreddit discovery, RedditGrow leans more into CRM-style tracking, OctoLens is the cheapest but the rule-detection is thinner so you'll get more removals early on. Worth trialing two in parallel for a week before committing — the differences show up fastest in false-positive rate on your specific keywords.",
      },
      {
        id: "draft-1b",
        variant: "peer",
        complianceVerdict: "caution",
        complianceNotes: "Reads slightly promotional in tone — no product mention but leans persuasive.",
        body: "Honestly all three are fine on paper, the real difference is in how well the scoring holds up on your specific niche. I'd run a 2-week trial on whichever has the best free tier and judge by how many irrelevant threads sneak into your feed.",
      },
      {
        id: "draft-1c",
        variant: "expert",
        complianceVerdict: "safe",
        complianceNotes: "No product mention — subreddit prohibits self-promotion.",
        body: "The meaningful axis to evaluate on isn't feature count, it's precision on your keyword set — most of these tools converge on the same Reddit API constraints (100 QPM per OAuth client), so the differentiation is entirely in the scoring layer. Ask each for a trial against your actual product profile before deciding.",
      },
    ],
  },
  {
    id: "opp-2",
    status: "saved",
    compositeScore: 8.4,
    intentScore: 8,
    citationScore: 8,
    freshnessReachScore: 9.0,
    reason: "Asks how to find early customers on Reddit without getting banned — direct fit.",
    matchedSignals: ["\"without getting banned\"", "founder audience", "high upvote velocity"],
    post: {
      subreddit: "startups",
      title: "How do you all find early customers on Reddit without getting banned?",
      body: "Every time I try to mention my product I get downvoted to oblivion or the mods remove it. Is there an actual playbook for this?",
      author: "throwaway_founder_88",
      permalink: "https://reddit.com/r/startups/comments/mock2",
      createdUtc: "2026-08-06T18:10:00Z",
      score: 88,
      numComments: 41,
    },
    subredditRules: {
      allowsPromo: true,
      allowsLinks: true,
      minAccountAgeDays: 14,
      minKarma: 25,
      rawRulesText: ["Self-promotion allowed only in direct response to a relevant question.", "No link spam."],
    },
    drafts: [
      {
        id: "draft-2a",
        variant: "helpful",
        complianceVerdict: "safe",
        complianceNotes: "Value delivered first; single mention, links permitted at this intent level.",
        body: "The playbook that's worked for us: answer the question in full before anything else, mention your product once if it's genuinely relevant, and never post more than a couple times a day in the same handful of subs. Rate limiting yourself matters more than anything else — accounts get flagged for velocity, not content.",
      },
      {
        id: "draft-2b",
        variant: "peer",
        complianceVerdict: "safe",
        complianceNotes: "No product mention.",
        body: "Biggest thing that changed it for us was slowing way down — a few genuine comments a day in subs we actually used, no links for the first month. By the time we did mention anything the account had real karma and it didn't read as spam.",
      },
      {
        id: "draft-2c",
        variant: "expert",
        complianceVerdict: "caution",
        complianceNotes: "Reads well but mentions product twice.",
        body: "We built Thread specifically because of this problem — Thread's rate governor caps you at 3/hour and 8/day with jitter, which is roughly the threshold mods stop noticing. Thread also runs a 7-day warm-up plan before letting commercial replies through, which is the other half of not getting flagged.",
      },
    ],
  },
  {
    id: "opp-3",
    status: "drafted",
    compositeScore: 6.8,
    intentScore: 6,
    citationScore: 5,
    freshnessReachScore: 6.1,
    reason: "General monitoring pain point, moderate citation potential.",
    matchedSignals: ["manual search pain point"],
    post: {
      subreddit: "Entrepreneur",
      title: "Is it worth hiring someone just to watch Reddit for leads?",
      body: "We get a decent number of customers from Reddit threads but it takes hours a day to find them. Wondering if a part-time hire or a tool makes more sense.",
      author: "smallbiz_owner_12",
      permalink: "https://reddit.com/r/Entrepreneur/comments/mock3",
      createdUtc: "2026-08-06T15:55:00Z",
      score: 39,
      numComments: 21,
    },
    subredditRules: {
      allowsPromo: false,
      allowsLinks: false,
      minAccountAgeDays: 7,
      minKarma: 10,
      rawRulesText: ["No advertising, promotion, or spam of any kind.", "No links to personal blogs, products, or services."],
    },
    drafts: [
      {
        id: "draft-3a",
        variant: "helpful",
        complianceVerdict: "safe",
        complianceNotes: "No product mention — subreddit prohibits both promo and links.",
        body: "A tool is almost always cheaper than a part-time hire for this specifically, because the bottleneck is search precision, not hours — a person will burn most of their time reading irrelevant threads too. Worth trying the free tier of a monitoring tool for two weeks before committing to headcount.",
      },
    ],
  },
];

export function getMockOpportunity(id: string): MockOpportunity | undefined {
  return mockOpportunities.find((o) => o.id === id);
}
