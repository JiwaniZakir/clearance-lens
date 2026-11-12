import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The CSP keeps script-src 'unsafe-inline' (DECISIONS.md D-044): Next.js
// emits inline hydration scripts, and the only alternative — per-request
// nonces — would force every page into dynamic rendering. That tradeoff is
// sound only while the app has no HTML-injection sink for an inline script
// to arrive through. The README states this publicly; this test keeps the
// claim true rather than letting it go stale.
const SINKS = /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML|document\.write|new Function\(|\beval\(/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(e.name) ? [full] : [];
  });
}

describe("no HTML-injection sink anywhere in app code (backs the CSP 'unsafe-inline' tradeoff)", () => {
  const files = ["app", "components", "lib"].flatMap((d) => sourceFiles(path.join(process.cwd(), d)));

  it("scans a non-trivial number of source files", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it("contains no dangerouslySetInnerHTML / innerHTML / insertAdjacentHTML / document.write / eval", () => {
    const hits = files.filter((f) => SINKS.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(process.cwd(), f));
    expect(hits, `HTML-injection sinks found — revisit the CSP decision (D-044): ${hits.join(", ")}`).toEqual([]);
  });
});
