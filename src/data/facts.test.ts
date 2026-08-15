import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  FactsValidationError,
  factsInitSnippet,
  loadFactsFromFile,
  parseFacts,
} from "./facts.js";

describe("parseFacts — valid cases", () => {
  it("accepts the minimal shape (no coverage, no custom facts)", () => {
    const facts = parseFacts({ tests_passed: 10, tests_total: 10 });
    expect(facts.tests_passed).toBe(10);
    expect(facts.tests_total).toBe(10);
    expect(facts.custom).toEqual([]);
    expect(facts.coverage_pct).toBeUndefined();
  });

  it("accepts coverage_pct and custom facts", () => {
    const facts = parseFacts({
      tests_passed: 42,
      tests_total: 50,
      coverage_pct: 87.5,
      custom: [
        { label: "Bundle size", value: "128kb", source: "webpack-stats.json" },
        { label: "P95 latency", value: 120, source: "k6 load test" },
      ],
    });
    expect(facts.coverage_pct).toBe(87.5);
    expect(facts.custom).toHaveLength(2);
    expect(facts.custom[0]?.label).toBe("Bundle size");
  });

  it("accepts tests_passed === 0 (an honest zero, not falsy-missing)", () => {
    const facts = parseFacts({ tests_passed: 0, tests_total: 0 });
    expect(facts.tests_passed).toBe(0);
  });

  it("accepts more than 2 custom facts (the template caps display, not the schema)", () => {
    const facts = parseFacts({
      tests_passed: 1,
      tests_total: 1,
      custom: [
        { label: "a", value: "1", source: "x" },
        { label: "b", value: "2", source: "x" },
        { label: "c", value: "3", source: "x" },
      ],
    });
    expect(facts.custom).toHaveLength(3);
  });
});

describe("parseFacts — invalid cases (rejected, never partially rendered)", () => {
  it("rejects tests_passed > tests_total", () => {
    expect(() => parseFacts({ tests_passed: 11, tests_total: 10 })).toThrow(
      FactsValidationError
    );
  });

  it("rejects a negative tests_total", () => {
    expect(() => parseFacts({ tests_passed: 0, tests_total: -1 })).toThrow(
      FactsValidationError
    );
  });

  it("rejects a non-integer tests_passed", () => {
    expect(() => parseFacts({ tests_passed: 1.5, tests_total: 2 })).toThrow(
      FactsValidationError
    );
  });

  it("rejects coverage_pct outside 0-100", () => {
    expect(() =>
      parseFacts({ tests_passed: 1, tests_total: 1, coverage_pct: 101 })
    ).toThrow(FactsValidationError);
  });

  it("rejects a custom fact missing a label", () => {
    expect(() =>
      parseFacts({
        tests_passed: 1,
        tests_total: 1,
        custom: [{ value: "x", source: "y" }],
      })
    ).toThrow(FactsValidationError);
  });

  it("rejects missing required fields entirely", () => {
    expect(() => parseFacts({})).toThrow(FactsValidationError);
  });

  it("rejects a non-object (array, string, null)", () => {
    expect(() => parseFacts([])).toThrow(FactsValidationError);
    expect(() => parseFacts("not facts")).toThrow(FactsValidationError);
    expect(() => parseFacts(null)).toThrow(FactsValidationError);
  });

  it("error message names the specific field that failed", () => {
    try {
      parseFacts({ tests_passed: 5, tests_total: 1 });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FactsValidationError);
      expect((err as FactsValidationError).message).toContain("tests_passed");
    }
  });
});

describe("loadFactsFromFile", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "galley-facts-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads and validates a real file from disk", () => {
    const p = join(dir, "facts.json");
    writeFileSync(p, JSON.stringify({ tests_passed: 3, tests_total: 3 }));
    const facts = loadFactsFromFile(p);
    expect(facts.tests_passed).toBe(3);
  });

  it("rejects malformed JSON with a clear error, not a crash", () => {
    const p = join(dir, "facts.json");
    writeFileSync(p, "{ this is not json");
    expect(() => loadFactsFromFile(p)).toThrow(FactsValidationError);
  });

  it("rejects a missing file with a clear error naming the path", () => {
    const p = join(dir, "does-not-exist.json");
    expect(() => loadFactsFromFile(p)).toThrow(/does-not-exist\.json/);
  });

  it("rejects a file that's valid JSON but fails the schema", () => {
    const p = join(dir, "facts.json");
    writeFileSync(p, JSON.stringify({ tests_total: 10 })); // missing tests_passed
    expect(() => loadFactsFromFile(p)).toThrow(FactsValidationError);
  });
});

describe("factsInitSnippet", () => {
  it("prints a snippet that reads the exact vitest JSON reporter keys galley expects", () => {
    const snippet = factsInitSnippet();
    expect(snippet).toContain("--reporter=json");
    expect(snippet).toContain("numPassedTests");
    expect(snippet).toContain("numTotalTests");
    expect(snippet).toContain("tests_passed");
    expect(snippet).toContain("tests_total");
  });
});
