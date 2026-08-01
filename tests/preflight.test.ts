import { describe, expect, it } from "vitest";
import {
  analyzeRedirectMap,
  directMapCsv,
  preflightArtifact,
  PreflightInputError,
} from "@/lib/preflight/analyze";
import { parseCsv } from "@/lib/preflight/parser";
import {
  cleanSample,
  defaultSettings,
  riskySample,
} from "@/lib/preflight/sample";

const inspect = (csvText: string, overrides = {}) =>
  analyzeRedirectMap({ ...defaultSettings, csvText, ...overrides });

describe("redirect CSV parser", () => {
  it("parses CRLF and a trailing line ending", () => {
    expect(parseCsv("source,target,status\r\n/a,/b,301\r\n")).toEqual([
      ["source", "target", "status"],
      ["/a", "/b", "301"],
    ]);
  });

  it("parses quoted commas, line breaks, and doubled quotes", () => {
    expect(parseCsv('a,b\n"one,two","line\nnext"\n"say ""yes""",ok')).toEqual([
      ["a", "b"],
      ["one,two", "line\nnext"],
      ['say "yes"', "ok"],
    ]);
  });

  it("removes a BOM from the first header", () => {
    expect(parseCsv("\uFEFFsource,target,status\n/a,/b,301")[0]).toEqual([
      "source",
      "target",
      "status",
    ]);
  });

  it("rejects an unclosed quote", () => {
    expect(() => parseCsv('source,target,status\n"/a,/b,301')).toThrow(
      "ends inside a quoted field",
    );
  });
});

describe("redirect preflight", () => {
  it("accepts the launch-ready map", () => {
    const result = inspect(cleanSample);
    expect(result.releaseState).toBe("ready");
    expect(result.summary).toEqual({
      mapRows: 5,
      directRules: 5,
      blockedRows: 0,
      critical: 0,
      high: 0,
      medium: 0,
    });
  });

  it("blocks the risky map across the documented rule families", () => {
    const result = inspect(riskySample);
    expect(result.releaseState).toBe("blocked");
    for (const rule of [
      "RDP005",
      "RDP007",
      "RDP008",
      "RDP009",
      "RDP010",
      "RDP011",
      "RDP013",
      "RDP014",
      "RDP015",
      "RDP016",
    ])
      expect(result.findings.some((finding) => finding.rule === rule)).toBe(
        true,
      );
  });

  it("flattens a chain to its terminal destination", () => {
    const result = inspect(
      "source,target,status\nhttps://old.example.com/a,https://old.example.com/b,301\nhttps://old.example.com/b,https://new.example.com/c,301",
    );
    expect(
      result.directRules.find((rule) => rule.source.endsWith("/a")),
    ).toMatchObject({
      finalTarget: "https://new.example.com/c",
      changed: true,
    });
  });

  it("omits loop members from direct rules", () => {
    const result = inspect(
      "source,target,status\n/a,https://old.example.com/b,301\n/b,https://old.example.com/a,301",
    );
    expect(result.findings.some((finding) => finding.rule === "RDP008")).toBe(
      true,
    );
    expect(result.directRules).toEqual([]);
  });

  it("blocks every row in a conflicting source group", () => {
    const result = inspect("source,target,status\n/a,/b,301\n/a,/c,301");
    expect(result.summary.blockedRows).toBe(2);
    expect(result.findings[0]?.rule).toBe("RDP005");
  });

  it("removes an identical duplicate from direct output", () => {
    const result = inspect("source,target,status\n/a,/b,301\n/a,/b,301");
    expect(result.releaseState).toBe("review");
    expect(result.directRules).toHaveLength(1);
    expect(result.findings[0]?.rule).toBe("RDP006");
  });

  it("blocks a self redirect", () => {
    const result = inspect(
      "source,target,status\nhttps://old.example.com/a,https://old.example.com/a,301",
      { targetOrigin: "https://old.example.com" },
    );
    expect(result.findings.some((finding) => finding.rule === "RDP007")).toBe(
      true,
    );
    expect(result.directRules).toEqual([]);
  });

  it("checks temporary intent against permanent statuses", () => {
    const result = inspect("source,target,status\n/a,/b,301", {
      migrationIntent: "temporary",
    });
    expect(result.findings[0]).toMatchObject({
      rule: "RDP010",
      severity: "high",
    });
  });

  it("blocks an HTTPS downgrade", () => {
    const result = inspect(
      "source,target,status\n/a,http://new.example.com/b,301",
    );
    expect(result.findings.some((finding) => finding.rule === "RDP011")).toBe(
      true,
    );
  });

  it("reports host drift and query loss for review", () => {
    const result = inspect(
      "source,target,status\nhttps://wrong.example.com/a?q=1,https://other.example.com/b,301",
    );
    expect(result.findings.map((finding) => finding.rule)).toEqual([
      "RDP012",
      "RDP013",
      "RDP016",
    ]);
  });

  it("reports a homepage catch-all at the configured threshold", () => {
    const result = inspect(
      "source,target,status\n/a,/,301\n/b,/,301\n/c,/,301",
    );
    expect(result.findings).toContainEqual(
      expect.objectContaining({ rule: "RDP015", severity: "medium" }),
    );
  });

  it("rejects a map without required headers", () => {
    expect(() => inspect("from,to,code\n/a,/b,301")).toThrow(
      "missing the source header",
    );
  });

  it("reports mismatched row fields", () => {
    const result = inspect("source,target,status\n/a,/b");
    expect(result.findings[0]?.rule).toBe("RDP002");
  });

  it("reports an unsupported status", () => {
    const result = inspect("source,target,status\n/a,/b,306");
    expect(result.findings[0]?.rule).toBe("RDP004");
  });

  it("reports non-root relative values as invalid URLs", () => {
    const result = inspect("source,target,status\nold-page,new-page,301");
    expect(result.findings[0]?.rule).toBe("RDP003");
  });

  it("rejects empty map input", () => {
    expect(() => inspect("")).toThrow(PreflightInputError);
  });

  it("rejects an origin that includes a path", () => {
    expect(() =>
      inspect(cleanSample, { sourceOrigin: "https://old.example.com/site" }),
    ).toThrow("without a path");
  });

  it("rejects maps above the row limit", () => {
    const rows = Array.from(
      { length: 5_001 },
      (_, index) => `/old-${index},/new-${index},301`,
    ).join("\n");
    expect(() => inspect(`source,target,status\n${rows}`)).toThrow(
      "at most 5,000",
    );
  });

  it("exports a quoted direct map", () => {
    const output = directMapCsv(
      inspect('source,target,status\n"/old,one",/new,301'),
    );
    expect(output).toContain(
      '"https://old.example.com/old,one","https://new.example.com/new","301"',
    );
  });

  it("exports machine-readable findings and rules", () => {
    const artifact = JSON.parse(preflightArtifact(inspect(cleanSample)));
    expect(artifact).toMatchObject({
      version: 1,
      releaseState: "ready",
      summary: { directRules: 5 },
    });
  });
});
