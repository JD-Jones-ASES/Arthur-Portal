#!/usr/bin/env node
/**
 * Text quality scan on the reading spine.
 *
 * The cleaner is deterministic, but source editions are not: a dropped heading,
 * a stray page number, an un-rejoined hyphenated word or a mojibake sequence will
 * all sail through a schema check and only show up as a reader wondering what
 * happened. So the built text is scanned for the artefacts that actually occur.
 */

import { loadSpines, loadWorks } from "../lib/data.mjs";

const CHECKS = [
  { id: "mojibake", rx: /[ÂÃ][\u0080-\u00bf]|â€|Ã©|Ã¢/, why: "UTF-8 read as Latin-1" },
  { id: "replacement-char", rx: /\ufffd/, why: "unmappable character" },
  { id: "gutenberg-leak", rx: /Project Gutenberg|www\.gutenberg\.org|START OF TH/i, why: "boilerplate not stripped" },
  { id: "italics-marker", rx: /_[A-Za-z]/, why: "Gutenberg underscore markup left in the text" },
  { id: "page-number", rx: /\[\s*\d{1,4}\s*\]/, why: "scanned page number" },
  { id: "broken-hyphen", rx: /[a-z]-\s+[a-z]/, why: "line-break hyphen not rejoined", warn: true },
  { id: "double-space", rx: {}, why: "" },
];

async function main() {
  const works = loadWorks();
  const spines = loadSpines(works);

  const problems = [];
  const warnings = [];
  let paragraphs = 0;
  let empties = 0;

  for (const [workId, { work, spine, units }] of spines) {
    if (work.tier === "C") problems.push(`${workId}: a Tier C work must not have a reading spine`);

    for (const id of spine.order) {
      const u = units[id];
      if (!u) continue;
      if (!u.paragraphs.length) {
        problems.push(`${id}: no paragraphs`);
        continue;
      }
      u.paragraphs.forEach((p, i) => {
        paragraphs++;
        if (!p.trim()) {
          empties++;
          problems.push(`${id} ¶${i}: empty paragraph`);
          return;
        }
        if (/\s{2,}/.test(p)) problems.push(`${id} ¶${i}: collapsed whitespace missed`);
        for (const c of CHECKS) {
          if (!(c.rx instanceof RegExp)) continue;
          if (c.rx.test(p)) {
            const m = c.rx.exec(p);
            const at = Math.max(0, m.index - 30);
            const msg = `${id} ¶${i}: ${c.id} (${c.why}) — "…${p.slice(at, m.index + 40)}…"`;
            (c.warn ? warnings : problems).push(msg);
          }
        }
      });

      // Tier B must be honest about what it is.
      if (work.tier === "B" && !work.tier_note) {
        problems.push(`${workId}: Tier B without a tier_note — the reader must be told the text is reflowed`);
      }
    }
  }

  console.log(`Text scan: ${paragraphs.toLocaleString()} paragraph(s) across ${spines.size} work(s).`);
  if (warnings.length) {
    console.log(`  · ${warnings.length} soft warning(s) (e.g. hyphenation the source itself prints):`);
    for (const w of warnings.slice(0, 5)) console.log("    " + w);
    if (warnings.length > 5) console.log(`    … and ${warnings.length - 5} more`);
  }

  if (problems.length) {
    console.error(`\n${problems.length} TEXT PROBLEM(S):`);
    for (const p of problems.slice(0, 40)) console.error("  ✗ " + p);
    if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
