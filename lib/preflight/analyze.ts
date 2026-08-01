/**
 * @project  RedirectPreflight — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  Proprietary — all rights reserved
 */
import { preflightInputSchema } from "@/lib/schemas/preflight";
import { CsvParseError, parseCsv } from "@/lib/preflight/parser";
import type {
  DirectRule,
  Finding,
  PreflightInput,
  PreflightResult,
  RedirectRule,
  ReleaseState,
  Severity,
} from "@/lib/preflight/types";

export class PreflightInputError extends Error {}

const supportedStatuses = new Set([301, 302, 307, 308]);
const severityRank: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

function graphKey(url: URL): string {
  return `${url.origin}${url.pathname}${url.search}`;
}

function parseHttpUrl(value: string, origin: string): URL | null {
  if (!value.startsWith("/") && !/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value, origin);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

function releaseFor(findings: Finding[]): ReleaseState {
  if (findings.some((finding) => finding.severity !== "medium"))
    return "blocked";
  if (findings.length > 0) return "review";
  return "ready";
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function directMapCsv(result: PreflightResult): string {
  return [
    "source,target,status",
    ...result.directRules.map((rule) =>
      [rule.source, rule.finalTarget, rule.status].map(csvCell).join(","),
    ),
  ].join("\n");
}

export function preflightArtifact(result: PreflightResult): string {
  return JSON.stringify(
    {
      version: 1,
      releaseState: result.releaseState,
      input: result.input,
      summary: result.summary,
      findings: result.findings,
      directRules: result.directRules,
    },
    null,
    2,
  );
}

export function analyzeRedirectMap(rawInput: PreflightInput): PreflightResult {
  const parsedInput = preflightInputSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    throw new PreflightInputError(
      parsedInput.error.issues[0]?.message ?? "Invalid preflight input.",
    );
  }
  const sourceOrigin = new URL(parsedInput.data.sourceOrigin).origin;
  const targetOrigin = new URL(parsedInput.data.targetOrigin).origin;
  let rows: string[][];
  try {
    rows = parseCsv(parsedInput.data.csvText);
  } catch (error) {
    if (error instanceof CsvParseError)
      throw new PreflightInputError(error.message);
    throw error;
  }
  if (rows.length === 0)
    throw new PreflightInputError("The redirect map has no header row.");
  const [rawHeaders, ...dataRows] = rows;
  if (dataRows.length > 5_000)
    throw new PreflightInputError(
      "This release accepts at most 5,000 redirect rows.",
    );
  const headers = rawHeaders.map((header) => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length)
    throw new PreflightInputError("Header names must be unique.");
  const requiredHeaders = ["source", "target", "status"];
  for (const header of requiredHeaders) {
    if (!headers.includes(header))
      throw new PreflightInputError(
        `The redirect map is missing the ${header} header.`,
      );
  }
  const sourceIndex = headers.indexOf("source");
  const targetIndex = headers.indexOf("target");
  const statusIndex = headers.indexOf("status");
  const findings: Finding[] = [];
  const rules: RedirectRule[] = [];
  const blockedRows = new Set<number>();
  const unusableRows = new Set<number>();

  const addFinding = (finding: Finding) => {
    findings.push(finding);
    if (finding.row && finding.severity !== "medium")
      blockedRows.add(finding.row);
  };

  dataRows.forEach((cells, dataIndex) => {
    const row = dataIndex + 2;
    if (cells.length !== headers.length) {
      addFinding({
        row,
        source: cells[sourceIndex]?.trim() || null,
        rule: "RDP002",
        severity: "high",
        message: "The row field count does not match the header.",
        repair: "Add or remove fields until this row matches the header.",
      });
      unusableRows.add(row);
      return;
    }
    const source = cells[sourceIndex]?.trim() ?? "";
    const target = cells[targetIndex]?.trim() ?? "";
    const statusText = cells[statusIndex]?.trim() ?? "";
    if (!source || !target || !statusText) {
      addFinding({
        row,
        source: source || null,
        rule: "RDP002",
        severity: "high",
        message: "Source, target, and status are required on every row.",
        repair: "Complete all three required cells.",
      });
      unusableRows.add(row);
      return;
    }
    const sourceUrl = parseHttpUrl(source, sourceOrigin);
    const targetUrl = parseHttpUrl(target, targetOrigin);
    if (!sourceUrl || !targetUrl) {
      addFinding({
        row,
        source: source || null,
        rule: "RDP003",
        severity: "high",
        message:
          "The source or target is not a valid HTTP URL or root-relative path.",
        repair: "Use an HTTP(S) URL or a path beginning with /.",
      });
      unusableRows.add(row);
      return;
    }
    const status = Number(statusText);
    if (!Number.isInteger(status) || !supportedStatuses.has(status)) {
      addFinding({
        row,
        source: sourceUrl.href,
        rule: "RDP004",
        severity: "high",
        message: "The status is not a supported redirect code.",
        repair: "Use 301, 302, 307, or 308.",
      });
      unusableRows.add(row);
      return;
    }
    const rule: RedirectRule = {
      row,
      source,
      target,
      status,
      sourceUrl: sourceUrl.href,
      targetUrl: targetUrl.href,
      sourceKey: graphKey(sourceUrl),
      targetKey: graphKey(targetUrl),
    };
    rules.push(rule);

    if (sourceUrl.hash) {
      addFinding({
        row,
        source: sourceUrl.href,
        rule: "RDP014",
        severity: "high",
        message:
          "A source URL contains a fragment that never reaches the server.",
        repair: "Remove the fragment and map the server-visible URL.",
      });
      unusableRows.add(row);
    }
    if (sourceUrl.origin !== sourceOrigin)
      addFinding({
        row,
        source: sourceUrl.href,
        rule: "RDP012",
        severity: "medium",
        message: "The source host differs from the declared source origin.",
        repair: "Confirm the host or correct the source origin setting.",
      });
    if (targetUrl.origin !== targetOrigin)
      addFinding({
        row,
        source: sourceUrl.href,
        rule: "RDP013",
        severity: "medium",
        message: "The target host differs from the declared target origin.",
        repair: "Confirm this cross-host destination before launch.",
      });
    if (sourceUrl.protocol === "https:" && targetUrl.protocol === "http:")
      addFinding({
        row,
        source: sourceUrl.href,
        rule: "RDP011",
        severity: "high",
        message: "The redirect downgrades an HTTPS request to HTTP.",
        repair: "Use an HTTPS target or document the transport exception.",
      });
    if (sourceUrl.search && !targetUrl.search)
      addFinding({
        row,
        source: sourceUrl.href,
        rule: "RDP016",
        severity: "medium",
        message: "The source query string is absent from the target.",
        repair: "Confirm that dropping query parameters is intentional.",
      });
    const intentMatches =
      parsedInput.data.migrationIntent === "permanent"
        ? [301, 308].includes(status)
        : [302, 307].includes(status);
    if (!intentMatches)
      addFinding({
        row,
        source: sourceUrl.href,
        rule: "RDP010",
        severity: "high",
        message: `The ${status} status conflicts with the declared ${parsedInput.data.migrationIntent} intent.`,
        repair:
          parsedInput.data.migrationIntent === "permanent"
            ? "Use 301 or 308 for a permanent move."
            : "Use 302 or 307 for a temporary move.",
      });
  });

  const groupedBySource = new Map<string, RedirectRule[]>();
  for (const rule of rules)
    groupedBySource.set(rule.sourceKey, [
      ...(groupedBySource.get(rule.sourceKey) ?? []),
      rule,
    ]);
  for (const group of groupedBySource.values()) {
    if (group.length < 2) continue;
    const variants = new Set(
      group.map((rule) => `${rule.targetKey}|${rule.status}`),
    );
    if (variants.size > 1) {
      for (const rule of group) {
        blockedRows.add(rule.row);
        unusableRows.add(rule.row);
      }
      addFinding({
        row: group[1].row,
        source: group[0].sourceUrl,
        rule: "RDP005",
        severity: "critical",
        message:
          "One source has conflicting redirect destinations or statuses.",
        repair: "Keep one authoritative rule for this source.",
      });
    } else {
      for (const duplicate of group.slice(1)) unusableRows.add(duplicate.row);
      addFinding({
        row: group[1].row,
        source: group[0].sourceUrl,
        rule: "RDP006",
        severity: "medium",
        message: "The same redirect rule appears more than once.",
        repair: "Remove duplicate rows before deployment.",
      });
    }
  }

  for (const rule of rules) {
    if (rule.sourceKey === rule.targetKey) {
      unusableRows.add(rule.row);
      addFinding({
        row: rule.row,
        source: rule.sourceUrl,
        rule: "RDP007",
        severity: "critical",
        message: "The rule redirects a URL back to itself.",
        repair: "Remove the rule or choose a different target.",
      });
    }
  }

  const graph = new Map<string, RedirectRule>();
  for (const rule of rules)
    if (!unusableRows.has(rule.row) && !graph.has(rule.sourceKey))
      graph.set(rule.sourceKey, rule);
  const loopNodes = new Set<string>();
  const loopSignatures = new Set<string>();
  for (const start of graph.keys()) {
    const order: string[] = [];
    const position = new Map<string, number>();
    let current = start;
    while (graph.has(current)) {
      const seenAt = position.get(current);
      if (seenAt !== undefined) {
        const cycle = order.slice(seenAt);
        const signature = [...cycle].sort().join("|");
        if (!loopSignatures.has(signature)) {
          loopSignatures.add(signature);
          for (const node of cycle) {
            loopNodes.add(node);
            const loopRule = graph.get(node)!;
            unusableRows.add(loopRule.row);
            blockedRows.add(loopRule.row);
          }
          const first = graph.get(cycle[0])!;
          addFinding({
            row: first.row,
            source: first.sourceUrl,
            rule: "RDP008",
            severity: "critical",
            message: `A redirect loop contains ${cycle.length} rules.`,
            repair:
              "Break the cycle and point each source toward a terminal destination.",
          });
        }
        break;
      }
      position.set(current, order.length);
      order.push(current);
      current = graph.get(current)!.targetKey;
    }
  }

  const directRules: DirectRule[] = [];
  for (const rule of rules) {
    if (unusableRows.has(rule.row) || loopNodes.has(rule.sourceKey)) continue;
    let finalTarget = rule.targetUrl;
    let current = rule.targetKey;
    let hops = 1;
    const visited = new Set([rule.sourceKey]);
    while (
      graph.has(current) &&
      !loopNodes.has(current) &&
      !visited.has(current)
    ) {
      visited.add(current);
      const nextRule = graph.get(current)!;
      finalTarget = nextRule.targetUrl;
      current = nextRule.targetKey;
      hops += 1;
    }
    if (hops > 1)
      addFinding({
        row: rule.row,
        source: rule.sourceUrl,
        rule: "RDP009",
        severity: "high",
        message: `The rule reaches its destination through ${hops} redirect hops.`,
        repair: `Point this source directly to ${finalTarget}.`,
      });
    directRules.push({
      source: rule.sourceUrl,
      finalTarget,
      status: rule.status,
      changed: hops > 1,
    });
  }

  const homeGroups = new Map<string, RedirectRule[]>();
  for (const rule of rules) {
    if (unusableRows.has(rule.row)) continue;
    const target = new URL(rule.targetUrl);
    if (target.pathname !== "/" || target.search) continue;
    homeGroups.set(rule.targetKey, [
      ...(homeGroups.get(rule.targetKey) ?? []),
      rule,
    ]);
  }
  for (const group of homeGroups.values()) {
    if (group.length >= 3)
      addFinding({
        row: null,
        source: null,
        rule: "RDP015",
        severity: "medium",
        message: `${group.length} sources converge on one homepage destination.`,
        repair:
          "Confirm that each source has no closer page-level destination.",
      });
  }

  findings.sort(
    (left, right) =>
      severityRank[left.severity] - severityRank[right.severity] ||
      (left.row ?? Number.MAX_SAFE_INTEGER) -
        (right.row ?? Number.MAX_SAFE_INTEGER) ||
      left.rule.localeCompare(right.rule),
  );
  const result: PreflightResult = {
    releaseState: releaseFor(findings),
    summary: {
      mapRows: dataRows.length,
      directRules: directRules.length,
      blockedRows: blockedRows.size,
      critical: findings.filter((finding) => finding.severity === "critical")
        .length,
      high: findings.filter((finding) => finding.severity === "high").length,
      medium: findings.filter((finding) => finding.severity === "medium")
        .length,
    },
    findings,
    directRules,
    input: {
      sourceOrigin,
      targetOrigin,
      migrationIntent: parsedInput.data.migrationIntent,
    },
  };
  return result;
}
