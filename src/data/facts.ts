// The facts.json data source (docs/SPEC.md §"Data layer", source 3 of 3).
// Optional, CI-produced: a small schema'd artifact the TARGET repo's own CI
// emits from its real test run. Unlike git/GitHub, an invalid facts.json is
// a hard error — "invalid facts are REJECTED with a clear error, never
// partially rendered" (docs/SPEC.md). Absence is fine (the beat degrades to
// "no data"); malformed presence is not.

import { readFileSync } from "node:fs";
import { z } from "zod";

const CustomFactSchema = z.object({
  label: z.string().min(1, "custom fact label must not be empty"),
  value: z.union([z.string(), z.number()]),
  source: z.string().min(1, "custom fact source must not be empty"),
});

export const FactsSchema = z
  .object({
    tests_passed: z.number().int().nonnegative(),
    tests_total: z.number().int().nonnegative(),
    coverage_pct: z.number().min(0).max(100).optional(),
    custom: z.array(CustomFactSchema).default([]),
  })
  .refine((f) => f.tests_passed <= f.tests_total, {
    message: "tests_passed cannot exceed tests_total",
    path: ["tests_passed"],
  });

export type CustomFact = z.infer<typeof CustomFactSchema>;
export type Facts = z.infer<typeof FactsSchema>;

export class FactsValidationError extends Error {
  constructor(
    message: string,
    readonly issues: z.ZodIssue[] = []
  ) {
    super(message);
    this.name = "FactsValidationError";
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/** Validates an already-parsed value against the facts.json schema. Throws on any mismatch. */
export function parseFacts(raw: unknown): Facts {
  const result = FactsSchema.safeParse(raw);
  if (!result.success) {
    throw new FactsValidationError(
      `facts.json failed schema validation:\n${formatIssues(result.error)}`,
      result.error.issues
    );
  }
  return result.data;
}

/** Reads + parses + validates a facts.json file from disk. Throws FactsValidationError on any problem. */
export function loadFactsFromFile(filePath: string): Facts {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    throw new FactsValidationError(
      `could not read facts file at ${filePath}: ${(err as Error).message}`
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new FactsValidationError(
      `facts file at ${filePath} is not valid JSON: ${(err as Error).message}`
    );
  }

  return parseFacts(json);
}

/**
 * The CI snippet `galley facts init` prints. Verified against a real
 * `vitest run --reporter=json --outputFile=...` invocation (M2) — the
 * output keys (numPassedTests/numTotalTests) are exactly what this reads.
 */
export function factsInitSnippet(): string {
  return `# galley facts init
#
# Paste this as a CI step AFTER your test step. It runs vitest with the
# JSON reporter, reads the real pass/total counts out of that report, and
# writes facts.json in the shape galley's \`render\`/\`poster\` commands
# expect. Swap the vitest invocation for your own test runner's JSON
# output if you don't use vitest — the only contract galley needs is the
# facts.json shape at the bottom.

npx vitest run --reporter=json --outputFile=.galley-vitest-report.json
node --input-type=module -e '
  import { readFileSync, writeFileSync, rmSync } from "node:fs";
  const report = JSON.parse(readFileSync(".galley-vitest-report.json", "utf8"));
  const facts = {
    tests_passed: report.numPassedTests,
    tests_total: report.numTotalTests,
    custom: [],
  };
  writeFileSync("facts.json", JSON.stringify(facts, null, 2) + "\\n");
  rmSync(".galley-vitest-report.json");
  console.log("wrote facts.json:", facts);
'

# facts.json shape (schema-validated by galley; invalid facts are rejected,
# never partially rendered):
#   {
#     "tests_passed": <int >= 0>,
#     "tests_total": <int >= tests_passed>,
#     "coverage_pct": <number 0-100, optional>,
#     "custom": [{ "label": "<string>", "value": <string|number>, "source": "<string>" }]
#   }
`;
}
