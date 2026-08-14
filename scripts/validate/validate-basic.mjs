#!/usr/bin/env node
/**
 * Schema gate: every data file must match its JSON-Schema contract.
 *
 * A mismatch means one side is wrong — fix the data or fix the schema, but never
 * silence the gate.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";
// Draft 2020-12 lives in a separate Ajv entry point; the default export is draft-07.
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = process.cwd();

/**
 * file (relative to repo root) -> schema. A `dir` entry validates every .json in
 * that directory against the schema.
 */
const CONTRACTS = [
  { file: "data/works/works.config.json", schema: "works.schema.json" },
  { file: "data/quotes.json", schema: "quotes.schema.json" },
  { file: "data/glossary/malory.json", schema: "glossary.schema.json" },
  { dir: "data/episodes", schema: "episode.schema.json" },
  { dir: "data/characters", schema: "character.schema.json" },
  { dir: "data/voices", schema: "voice.schema.json" },
  { dir: "data/cuts", schema: "cut.schema.json" },
  { dir: "data/follows", schema: "follow.schema.json" },
  { dir: "data/paths", schema: "path.schema.json" },
  { dir: "data/essays", schema: "essay.schema.json" },
];

async function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  let checked = 0;
  const problems = [];

  for (const contract of CONTRACTS) {
    const schemaPath = resolve(ROOT, "schemas", contract.schema);
    if (!existsSync(schemaPath)) continue; // schema not written yet — that layer isn't built

    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const validate = ajv.compile(schema);

    const files = [];
    if (contract.file) {
      if (existsSync(resolve(ROOT, contract.file))) files.push(resolve(ROOT, contract.file));
    } else {
      const dir = resolve(ROOT, contract.dir);
      if (existsSync(dir)) {
        for (const f of await readdir(dir)) if (f.endsWith(".json")) files.push(join(dir, f));
      }
    }

    for (const f of files) {
      checked++;
      const data = JSON.parse(await readFile(f, "utf8"));
      if (!validate(data)) {
        for (const err of validate.errors ?? []) {
          problems.push(
            `${f.slice(ROOT.length + 1)}  ${err.instancePath || "/"}  ${err.message}` +
              (err.params?.allowedValues ? ` (allowed: ${err.params.allowedValues.join(", ")})` : "") +
              (err.params?.additionalProperty ? ` — unexpected "${err.params.additionalProperty}"` : "")
          );
        }
      }
    }
  }

  console.log(`Schemas: ${checked} file(s) checked against ${CONTRACTS.length} contract(s).`);
  if (problems.length) {
    console.error(`\n${problems.length} schema violation(s):`);
    for (const p of problems.slice(0, 60)) console.error("  ✗ " + p);
    if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
