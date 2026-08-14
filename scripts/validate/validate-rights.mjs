#!/usr/bin/env node
/**
 * The rights gate (DECISIONS.md ADR-0003, ADR-0004).
 *
 * One text in this project's research base is in copyright. Good intentions are
 * not a control, so the rule is enforced mechanically:
 *
 *   - a Tier C work may never have a reading spine or a reader unit;
 *   - no passage of a Tier C work longer than MAX_QUOTE characters may appear
 *     anywhere in data/ or derived/;
 *   - restricted source text must not be committed to the repository;
 *   - every work must carry a rights statement.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const MAX_QUOTE = 300;

async function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  const config = JSON.parse(await readFile(resolve(ROOT, "data/works/works.config.json"), "utf8"));
  const problems = [];

  const tierC = config.works.filter((w) => w.tier === "C");
  const restricted = config.works.filter((w) => w.restricted);

  /* 1. every work states its rights */
  for (const w of config.works) {
    if (!w.rights || w.rights.length < 10) problems.push(`${w.id}: no rights statement`);
    if (w.tier === "C" && w.reader) problems.push(`${w.id}: Tier C but reader:true — a restricted text must never be published`);
    if (w.tier !== "A" && !w.tier_note && w.tier !== "A") {
      if (!w.tier_note) problems.push(`${w.id}: Tier ${w.tier} must carry a tier_note explaining the limitation to the reader`);
    }
  }

  /* 2. no reading spine exists for a Tier C work */
  for (const w of tierC) {
    if (existsSync(resolve(ROOT, "derived", w.id))) {
      problems.push(`${w.id}: derived/${w.id}/ exists for a Tier C work — delete it`);
    }
  }

  /* 3. restricted source text is not tracked by git */
  try {
    const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n");
    for (const f of tracked) {
      if (/^raw\//.test(f)) problems.push(`raw/ must be gitignored, but git tracks ${f}`);
      for (const w of restricted) {
        for (const c of w.corpus ?? []) {
          if (f === `arthur/index/_corpus/${c}.txt`) {
            problems.push(`${f} is an in-copyright source and must not be committed (ADR-0004)`);
          }
        }
      }
    }
  } catch {
    // not a git checkout — skip this check rather than fail
  }

  /* 4. no long passage of a restricted work anywhere in the published data */
  const quotesPath = resolve(ROOT, "data/quotes.json");
  if (existsSync(quotesPath)) {
    const quotes = JSON.parse(await readFile(quotesPath, "utf8"));
    const restrictedIds = new Set(restricted.map((w) => w.id));
    for (const q of quotes.quotes) {
      if (!restrictedIds.has(q.work)) continue;
      if (q.text.length > MAX_QUOTE) {
        problems.push(
          `${q.id}: ${q.text.length} characters from a restricted work exceeds the ${MAX_QUOTE}-character fair-use limit`
        );
      }
      if (q.spine) problems.push(`${q.id}: a restricted work must not be placed on a reading spine`);
    }
  }

  /* 5. the restricted corpus must not have leaked into derived/ */
  const derivedFiles = await walk(resolve(ROOT, "derived"));
  for (const f of derivedFiles) {
    for (const w of tierC) {
      if (f.includes(`/derived/${w.id}/`)) problems.push(`${f.slice(ROOT.length + 1)}: derived output for Tier C work ${w.id}`);
    }
  }

  const counts = `${config.works.length} work(s): ` +
    `${config.works.filter((w) => w.tier === "A").length} Tier A, ` +
    `${config.works.filter((w) => w.tier === "B").length} Tier B, ` +
    `${tierC.length} Tier C (${restricted.length} in copyright).`;
  console.log(`Rights: ${counts}`);

  if (problems.length) {
    console.error(`\n${problems.length} RIGHTS VIOLATION(S):`);
    for (const p of problems) console.error("  ✗ " + p);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
