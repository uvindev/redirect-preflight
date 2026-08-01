# RedirectPreflight 0.1 specification

## User journey

1. Declare source origin, target origin, and permanent or temporary migration intent.
2. Paste a CSV redirect map with `source,target,status` headers.
3. Run preflight in the browser.
4. Review release state, graph findings, and direct-route board.
5. Copy a direct-map CSV or JSON audit artifact.

## Functional contract

- Accept absolute HTTP(S) URLs and root-relative paths.
- Parse comma-delimited CSV, CRLF or LF, quoted commas and line breaks, doubled quotes, and a UTF-8 BOM.
- Accept redirect statuses 301, 302, 307, and 308.
- Find malformed rows, invalid URLs, unsupported statuses, conflicting or repeated sources, self-redirects, loops, chains, status-intent conflicts, source or target host drift, HTTPS downgrades, source fragments, query loss, and groups of at least three sources that converge on one homepage `[TARGET]`.
- Resolve safe chains to terminal destinations in the direct-map output.
- Omit malformed, conflicting, looped, self-referential, and fragment-based source rows from that output.
- Sort findings by severity, row, and rule.

## Release states

- `blocked`: at least one critical or high finding.
- `review`: medium findings only.
- `ready`: no findings.

## Constraints and threats

- Process map content only in the browser. Analytics receive event names only.
- Cap text at 1,000,000 characters and data at 5,000 rows.
- Reject URL credentials and non-HTTP schemes.
- Never fetch source or target URLs in version 0.1.
- Generated artifacts contain the submitted route URLs by design. The user decides where those files are shared.
- Static analysis cannot verify deployed behavior, destination availability, caching, platform precedence, or search indexing.

## Monetization and analytics

- Free: one local map and exports.
- Team hypothesis: [TARGET] $24 per workspace per month for shared versions, approvals, inventory coverage, platform exports, CI, and history.
- Events: `preflight_viewed`, `redirect_map_checked`, `direct_map_copied`, `team_interest`, and `feedback_intent`.
- Events never include redirect-map content.

## Acceptance checks

- Risky example returns blocked with loop, chain, conflict, self, status, host, downgrade, fragment, query, and catch-all findings.
- Clean permanent example returns ready and five direct rules.
- A chain is flattened in `direct-map.csv`.
- Empty, malformed, oversized, and invalid-origin inputs show specific recovery messages.
- Production browser checks cover risky, clean, empty, clipboard, console, response headers, and 320px layout states.
