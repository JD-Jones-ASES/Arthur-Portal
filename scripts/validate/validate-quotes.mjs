#!/usr/bin/env node
/**
 * The quote gate — the discipline this whole portal inherits from the research
 * base, re-implemented here because the base's own engine (`_engine/tools/`)
 * lives in another repository.
 *
 * Every quotation published on this site must be locatable in the source text it
 * claims to come from. Not "checked once"; checked on every run, in CI, forever.
 * A quotation that cannot be found does not ship.
 *
 * Two things are verified:
 *   1. the ledger in arthur/index/quotes.json still locates in its corpus source,
 *      at or above the per-source fuzzy threshold in arthur/base.json;
 *   2. the generated data/quotes.json is in step with that ledger — no quote has
 *      been added, edited or dropped downstream of the gate.
 *
 * In-copyright sources are handled per DECISIONS.md ADR-0004: validated in full
 * when raw/restricted/ is present, else verified against the committed
 * attestation.
 */

import { readFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { normalise, locate, squash } from "../lib/text.mjs";

const ROOT = process.cwd();
const CORPUS = resolve(ROOT, "arthur/index/_corpus");
const RESTRICTED = resolve(ROOT, "raw/restricted");

const sha = (s) => createHash("sha256").update(s).digest("hex");

async function main() {
  const base = JSON.parse(await readFile(resolve(ROOT, "arthur/base.json"), "utf8"));
  const ledger = JSON.parse(await readFile(resolve(ROOT, "arthur/index/quotes.json"), "utf8"));
  const generated = JSON.parse(await readFile(resolve(ROOT, "data/quotes.json"), "utf8"));
  const attest = existsSync(resolve(ROOT, "data/attestations.json"))
    ? JSON.parse(await readFile(resolve(ROOT, "data/attestations.json"), "utf8"))
    : { attestations: {} };

  const defaultThreshold = base.fuzzy_threshold ?? 0.9;
  const problems = [];
  const stats = { exact: 0, fuzzy: 0, attestation: 0 };

  const cache = new Map();
  const corpusFor = (id) => {
    if (cache.has(id)) return cache.get(id);
    let file = join(CORPUS, `${id}.txt`);
    let restricted = false;
    if (!existsSync(file)) {
      const alt = join(RESTRICTED, `${id}.txt`);
      if (!existsSync(alt)) {
        cache.set(id, null);
        return null;
      }
      file = alt;
      restricted = true;
    }
    const entry = { norm: normalise(readFileSync(file, "utf8")), restricted };
    cache.set(id, entry);
    return entry;
  };

  for (const q of ledger.quotes) {
    const threshold = base.sources[q.source]?.fuzzy_threshold ?? defaultThreshold;
    const needle = normalise(q.text);
    const corpus = corpusFor(q.source);

    if (!corpus) {
      const a = attest.attestations?.[q.id];
      if (!a) {
        problems.push(`${q.id}: source "${q.source}" is not available and there is no attestation for it`);
      } else if (a.text_sha256 !== sha(needle)) {
        problems.push(
          `${q.id}: quotation text has changed since it was attested — re-run prepare:data with the restricted source present`
        );
      } else {
        stats.attestation++;
      }
      continue;
    }

    const hit = locate(corpus.norm, needle, threshold);
    if (!hit) {
      problems.push(
        `${q.id}: NOT LOCATED in ${q.source} (threshold ${threshold}) — "${squash(q.text).slice(0, 70)}…"`
      );
      continue;
    }
    if (hit.ratio === 1) stats.exact++;
    else stats.fuzzy++;
  }

  /* --- the generated ledger must not have drifted from the source of truth --- */
  const ledgerIds = new Set(ledger.quotes.map((q) => q.id));
  const genIds = new Set(generated.quotes.map((q) => q.id));
  for (const id of ledgerIds) if (!genIds.has(id)) problems.push(`${id}: in the base ledger but missing from data/quotes.json — run prepare:data`);
  for (const id of genIds) if (!ledgerIds.has(id)) problems.push(`${id}: in data/quotes.json but not in the base ledger — it has no source of truth`);

  const byId = new Map(ledger.quotes.map((q) => [q.id, q]));
  for (const g of generated.quotes) {
    const src = byId.get(g.id);
    if (src && normalise(src.text) !== normalise(g.text)) {
      problems.push(`${g.id}: text in data/quotes.json differs from the base ledger — run prepare:data`);
    }
  }

  const total = stats.exact + stats.fuzzy + stats.attestation;
  console.log(
    `Quotes: ${total}/${ledger.quotes.length} located ` +
      `(${stats.exact} exact, ${stats.fuzzy} fuzzy, ${stats.attestation} by attestation).`
  );
  if (!existsSync(RESTRICTED)) {
    console.log("  note: raw/restricted/ absent — in-copyright sources verified by attestation (ADR-0004).");
  }

  if (problems.length) {
    console.error(`\n${problems.length} QUOTE FAILURE(S) — nothing ships until these are located:`);
    for (const p of problems) console.error("  ✗ " + p);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
