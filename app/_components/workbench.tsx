"use client";

import { useEffect, useState } from "react";
import {
  analyzeRedirectMap,
  directMapCsv,
  preflightArtifact,
  PreflightInputError,
} from "@/lib/preflight/analyze";
import {
  cleanSample,
  defaultSettings,
  riskySample,
} from "@/lib/preflight/sample";
import type { MigrationIntent, PreflightResult } from "@/lib/preflight/types";
import { track } from "@/lib/analytics";

export function Workbench() {
  const [csvText, setCsvText] = useState(riskySample);
  const [sourceOrigin, setSourceOrigin] = useState(
    defaultSettings.sourceOrigin,
  );
  const [targetOrigin, setTargetOrigin] = useState(
    defaultSettings.targetOrigin,
  );
  const [migrationIntent, setMigrationIntent] = useState<MigrationIntent>(
    defaultSettings.migrationIntent,
  );
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"map" | "artifact" | null>(null);
  const [copyError, setCopyError] = useState("");

  useEffect(() => track("preflight_viewed"), []);

  function inspectMap() {
    setCopyState(null);
    setCopyError("");
    try {
      setResult(
        analyzeRedirectMap({
          csvText,
          sourceOrigin,
          targetOrigin,
          migrationIntent,
        }),
      );
      setError("");
      track("redirect_map_checked");
    } catch (cause) {
      setResult(null);
      setError(
        cause instanceof PreflightInputError
          ? cause.message
          : "The map could not be analyzed.",
      );
    }
  }

  function loadMap(map: string) {
    setCsvText(map);
    setResult(null);
    setError("");
    setCopyState(null);
    setCopyError("");
  }

  async function copyOutput(kind: "map" | "artifact", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(kind);
      setCopyError("");
      if (kind === "map") track("direct_map_copied");
    } catch {
      setCopyError(
        "Clipboard access was denied. Select the output text and copy it manually.",
      );
    }
  }

  const mapOutput = result ? directMapCsv(result) : "";
  const artifactOutput = result ? preflightArtifact(result) : "";

  return (
    <section
      className="workbench"
      id="preflight"
      aria-labelledby="preflight-title"
    >
      <header className="workbench-heading">
        <div>
          <p className="kicker">Routing desk / local graph</p>
          <h2 id="preflight-title">
            Declare the move, then inspect every edge.
          </h2>
        </div>
        <p className="local-stamp">NO CRAWL / NO UPLOAD</p>
      </header>

      <div className="settings-strip">
        <label>
          <span>Source origin</span>
          <input
            type="url"
            value={sourceOrigin}
            onChange={(event) => setSourceOrigin(event.target.value)}
          />
        </label>
        <label>
          <span>Target origin</span>
          <input
            type="url"
            value={targetOrigin}
            onChange={(event) => setTargetOrigin(event.target.value)}
          />
        </label>
        <label>
          <span>Migration intent</span>
          <select
            value={migrationIntent}
            onChange={(event) =>
              setMigrationIntent(event.target.value as MigrationIntent)
            }
          >
            <option value="permanent">Permanent move</option>
            <option value="temporary">Temporary routing</option>
          </select>
        </label>
      </div>

      <label className="map-editor">
        <span>
          <b>MAP INPUT</b>
          <small>
            CSV headers: source,target,status /{" "}
            {csvText.split(/\r?\n/).length - 1} data rows
          </small>
        </span>
        <textarea
          aria-label="Redirect map CSV"
          spellCheck={false}
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
        />
      </label>

      <div className="workbench-actions">
        <button className="inspect-button" type="button" onClick={inspectMap}>
          Run redirect preflight
        </button>
        <button type="button" onClick={() => loadMap(riskySample)}>
          Restore risky map
        </button>
        <button type="button" onClick={() => loadMap(cleanSample)}>
          Load launch-ready map
        </button>
        <button type="button" onClick={() => loadMap("")}>
          Clear map
        </button>
      </div>

      <div className="result-region" aria-live="polite">
        {error ? (
          <div className="input-error" role="alert">
            <strong>PREFLIGHT STOPPED</strong>
            <span>{error}</span>
            <button type="button" onClick={() => loadMap(riskySample)}>
              Restore the example map
            </button>
          </div>
        ) : null}
        {!result && !error ? (
          <div className="empty-result">
            <span>AWAITING MAP CHECK</span>
            <p>
              The supplied map contains a chain, loop, conflict, downgrade, and
              query-loss case.
            </p>
          </div>
        ) : null}
        {result ? (
          <div className={`preflight-result ${result.releaseState}`}>
            <header className="result-header">
              <div>
                <span>LAUNCH ROUTE STATUS</span>
                <strong>{result.releaseState.toUpperCase()}</strong>
              </div>
              <p>
                {result.releaseState === "ready"
                  ? "The supplied graph has direct rules and no detected policy conflict."
                  : result.releaseState === "review"
                    ? "Resolve or accept the warnings before exporting rules."
                    : "Blocking routes need a migration-owner decision before launch."}
              </p>
            </header>
            <dl className="summary-strip">
              <div>
                <dt>Map rows</dt>
                <dd>{result.summary.mapRows}</dd>
              </div>
              <div>
                <dt>Direct rules</dt>
                <dd>{result.summary.directRules}</dd>
              </div>
              <div>
                <dt>Blocked rows</dt>
                <dd>{result.summary.blockedRows}</dd>
              </div>
              <div>
                <dt>Critical</dt>
                <dd>{result.summary.critical}</dd>
              </div>
              <div>
                <dt>High</dt>
                <dd>{result.summary.high}</dd>
              </div>
              <div>
                <dt>Medium</dt>
                <dd>{result.summary.medium}</dd>
              </div>
            </dl>

            <div className="route-board">
              <div className="section-label">
                <h3>Direct route board</h3>
                <span>
                  {result.directRules.length} resolved rule
                  {result.directRules.length === 1 ? "" : "s"}
                </span>
              </div>
              {result.directRules.length === 0 ? (
                <p className="no-direct-rules">
                  No graph-resolvable rules remain. Repair conflicts and loops
                  first.
                </p>
              ) : (
                <ol>
                  {result.directRules.slice(0, 6).map((rule) => (
                    <li key={rule.source}>
                      <code>{new URL(rule.source).pathname || "/"}</code>
                      <span
                        className={
                          rule.changed ? "route-arrow changed" : "route-arrow"
                        }
                      >
                        {rule.changed ? "CHAIN → DIRECT" : "DIRECT →"}
                      </span>
                      <code>{new URL(rule.finalTarget).pathname || "/"}</code>
                      <b>{rule.status}</b>
                    </li>
                  ))}
                </ol>
              )}
              {result.directRules.length > 6 ? (
                <p className="route-overflow">
                  {result.directRules.length - 6} more rules are included in the
                  direct-map output.
                </p>
              ) : null}
            </div>

            <div className="findings-section">
              <div className="section-label">
                <h3>Finding register</h3>
                <span>
                  {result.findings.length} finding
                  {result.findings.length === 1 ? "" : "s"}
                </span>
              </div>
              {result.findings.length === 0 ? (
                <p className="clear-note">
                  No graph or policy findings detected in this map.
                </p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Rule</th>
                        <th>Severity</th>
                        <th>Source</th>
                        <th>Finding / repair</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.findings.map((finding, index) => (
                        <tr key={`${finding.rule}-${finding.row}-${index}`}>
                          <td>{finding.row ?? "MAP"}</td>
                          <td>
                            <code>{finding.rule}</code>
                          </td>
                          <td>
                            <span className={`severity ${finding.severity}`}>
                              {finding.severity}
                            </span>
                          </td>
                          <td>
                            <small className="source-cell">
                              {finding.source ?? "map-wide"}
                            </small>
                          </td>
                          <td>
                            <strong>{finding.message}</strong>
                            <small>{finding.repair}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="outputs">
              <article>
                <div>
                  <span>direct-map.csv</span>
                  <button
                    type="button"
                    onClick={() => void copyOutput("map", mapOutput)}
                  >
                    {copyState === "map" ? "Copied" : "Copy direct map"}
                  </button>
                </div>
                <pre>{mapOutput}</pre>
              </article>
              <article>
                <div>
                  <span>redirect-preflight.json</span>
                  <button
                    type="button"
                    onClick={() => void copyOutput("artifact", artifactOutput)}
                  >
                    {copyState === "artifact" ? "Copied" : "Copy audit JSON"}
                  </button>
                </div>
                <pre>{artifactOutput}</pre>
              </article>
            </div>
            {copyError ? (
              <p className="copy-error" role="alert">
                {copyError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
