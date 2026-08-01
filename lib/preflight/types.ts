/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
export type MigrationIntent = "permanent" | "temporary";
export type Severity = "critical" | "high" | "medium";
export type ReleaseState = "ready" | "review" | "blocked";

export interface PreflightInput {
  csvText: string;
  sourceOrigin: string;
  targetOrigin: string;
  migrationIntent: MigrationIntent;
}

export interface RedirectRule {
  row: number;
  source: string;
  target: string;
  status: number;
  sourceUrl: string;
  targetUrl: string;
  sourceKey: string;
  targetKey: string;
}

export interface Finding {
  row: number | null;
  source: string | null;
  rule: string;
  severity: Severity;
  message: string;
  repair: string;
}

export interface DirectRule {
  source: string;
  finalTarget: string;
  status: number;
  changed: boolean;
}

export interface PreflightSummary {
  mapRows: number;
  directRules: number;
  blockedRows: number;
  critical: number;
  high: number;
  medium: number;
}

export interface PreflightResult {
  releaseState: ReleaseState;
  summary: PreflightSummary;
  findings: Finding[];
  directRules: DirectRule[];
  input: Omit<PreflightInput, "csvText">;
}
