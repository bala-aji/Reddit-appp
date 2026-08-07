export type ComplianceVerdict = "safe" | "caution" | "blocked";

export interface ComplianceViolation {
  rule: string;
  verdict: ComplianceVerdict;
  detail: string;
}

export interface ComplianceCheckInput {
  draftBody: string;
  productName: string;
  productUrl?: string;
  /** Intent score (0-10) of the opportunity this draft is replying to — links require intent >= 8 (PRD F3). */
  intentScore: number;
  threadUsesBullets: boolean;
  subredditRules: {
    allowsPromo: boolean | null;
    allowsLinks: boolean | null;
  };
}

export interface ComplianceCheckResult {
  verdict: ComplianceVerdict;
  violations: ComplianceViolation[];
}
