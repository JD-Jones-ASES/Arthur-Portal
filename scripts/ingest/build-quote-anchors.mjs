#!/usr/bin/env node
/**
 * Resolve every quotation in the research base's ledger to two places at once:
 *
 *   1. its SOURCE — arthur/index/_corpus/<source>.txt, the whitespace-flattened
 *      corpus the base validates against. This is the base's own discipline and
 *      it is preserved exactly: a quote that cannot be found here does not ship.
 *
 *   2. its SPINE position — the derived reading text, as {unit, paragraph, from,
 *      to}. This is what lets the reader highlight a validated quotation exactly
 *      where it sits on the page, which is the whole point: you can see the
 *      ledger anchored in the source rather than taking it on trust.
 *
 * Restricted sources (the in-copyright Lacy Vulgate) are validated in full when
 * raw/restricted/ is present, and the result is written to data/attestations.json
 * so CI and fresh clones can verify without the text. See DECISIONS.md ADR-0004.
 *
 * Output: data/quotes.json, data/attestations.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { normalise, normaliseWithMap, locate, squash } from "../lib/text.mjs";

const ROOT = process.cwd();
const CORPUS = resolve(ROOT, "arthur/index/_corpus");
const RESTRICTED = resolve(ROOT, "raw/restricted");

const sha = (s) => createHash("sha256").update(s).digest("hex");

async function main() {
  const base = JSON.parse(await readFile(resolve(ROOT, "arthur/base.json"), "utf8"));
  const ledger = JSON.parse(await readFile(resolve(ROOT, "arthur/index/quotes.json"), "utf8"));
  const works = JSON.parse(await readFile(resolve(ROOT, "data/works/works.config.json"), "utf8"));

  const defaultThreshold = base.fuzzy_threshold ?? 0.9;

  // corpus source id -> work id
  const sourceToWork = new Map();
  for (const w of works.works) for (const c of w.corpus ?? []) sourceToWork.set(c, w.id);
  const workById = new Map(works.works.map((w) => [w.id, w]));

  // Load corpora lazily; they are large.
  const corpusCache = new Map();
  function corpusFor(sourceId) {
    if (corpusCache.has(sourceId)) return corpusCache.get(sourceId);
    let file = join(CORPUS, `${sourceId}.txt`);
    let restricted = false;
    if (!existsSync(file)) {
      const alt = join(RESTRICTED, `${sourceId}.txt`);
      if (existsSync(alt)) {
        file = alt;
        restricted = true;
      } else {
        corpusCache.set(sourceId, null);
        return null;
      }
    }
    const raw = require("node:fs").readFileSync(file, "utf8");
    const entry = { raw, norm: normalise(raw), restricted };
    corpusCache.set(sourceId, entry);
    return entry;
  }

  // Load the derived spines so quotes can be placed on the page.
  const spines = new Map();
  for (const w of works.works) {
    const dir = resolve(ROOT, "derived", w.id);
    if (!existsSync(join(dir, "units.json"))) continue;
    const units = JSON.parse(await readFile(join(dir, "units.json"), "utf8"));
    const spine = JSON.parse(await readFile(join(dir, "spine.json"), "utf8"));
    // Pre-normalise every paragraph once.
    const index = [];
    for (const id of spine.order) {
      const u = units[id];
      u.paragraphs.forEach((p, i) => {
        const { normalised, map } = normaliseWithMap(p);
        index.push({ unit: id, para: i, raw: p, norm: normalised, map });
      });
    }
    spines.set(w.id, { spine, units, index });
  }

  const priorAttest = existsSync(resolve(ROOT, "data/attestations.json"))
    ? JSON.parse(await readFile(resolve(ROOT, "data/attestations.json"), "utf8"))
    : { attestations: {} };

  const out = [];
  const attestations = {};
  const problems = [];
  let placed = 0;
  let unplaceable = 0;

  for (const q of ledger.quotes) {
    const srcMeta = base.sources[q.source] ?? {};
    const threshold = srcMeta.fuzzy_threshold ?? defaultThreshold;
    const corpus = corpusFor(q.source);
    const workId = sourceToWork.get(q.source) ?? null;
    const work = workId ? workById.get(workId) : null;

    const needle = normalise(q.text);
    let validation;

    if (corpus) {
      const hit = locate(corpus.norm, needle, threshold);
      if (!hit) {
        problems.push(`${q.id}: NOT FOUND in ${q.source} (threshold ${threshold})`);
        continue;
      }
      validation = {
        method: hit.ratio === 1 ? "exact" : "fuzzy",
        ratio: Number(hit.ratio.toFixed(4)),
        threshold,
        checked_at: new Date().toISOString().slice(0, 10),
      };
      if (corpus.restricted) {
        attestations[q.id] = {
          quote_id: q.id,
          source: q.source,
          work: workId,
          text_sha256: sha(needle),
          ratio: validation.ratio,
          anchor: q.anchor,
          validated_at: validation.checked_at,
          note:
            "Validated against an in-copyright translation held outside the repository. " +
            "The text is not redistributed; this record proves the quotation was located.",
        };
      }
    } else {
      // No corpus available. Fall back to the committed attestation.
      const att = priorAttest.attestations?.[q.id];
      if (att && att.text_sha256 === sha(needle)) {
        validation = {
          method: "attestation",
          ratio: att.ratio,
          threshold,
          checked_at: att.validated_at,
        };
        attestations[q.id] = att;
      } else {
        problems.push(
          `${q.id}: source "${q.source}" unavailable and no matching attestation ` +
            `(restricted text absent, or the quote text changed since it was attested)`
        );
        continue;
      }
    }

    /* --- place the quote on the reading spine, if the work has one --- */
    let anchor = null;
    const spineData = workId ? spines.get(workId) : null;
    if (spineData) {
      for (const entry of spineData.index) {
        const at = entry.norm.indexOf(needle);
        if (at === -1) continue;
        const from = entry.map[at];
        const to = entry.map[Math.min(at + needle.length - 1, entry.map.length - 1)] + 1;
        anchor = { unit: entry.unit, paragraph: entry.para, from, to, method: "exact" };
        break;
      }
      if (!anchor) {
        // Fuzzy: only worth trying paragraph by paragraph on plausible lengths.
        for (const entry of spineData.index) {
          if (Math.abs(entry.norm.length - needle.length) > needle.length * 2) continue;
          const hit = locate(entry.norm, needle, Math.max(threshold, 0.93));
          if (!hit) continue;
          const from = entry.map[hit.index];
          const to = entry.map[Math.min(hit.index + needle.length - 1, entry.map.length - 1)] + 1;
          anchor = { unit: entry.unit, paragraph: entry.para, from, to, method: "fuzzy", ratio: Number(hit.ratio.toFixed(4)) };
          break;
        }
      }
      if (anchor) placed++;
      else {
        unplaceable++;
        // Not an error: the corpus edition and the reader edition are often
        // different translations of the same work (Geoffrey, for one).
      }
    }

    out.push({
      id: q.id,
      voice: q.thinker,
      source: q.source,
      work: workId,
      work_title: work?.title ?? q.work,
      branch: work?.branch ?? null,
      citation: q.work,
      anchor_label: q.anchor,
      text: squash(q.text),
      tags: q.tags ?? [],
      restricted: Boolean(work?.restricted),
      validation,
      spine: anchor,
    });
  }

  await mkdir(resolve(ROOT, "data"), { recursive: true });
  await writeFile(
    resolve(ROOT, "data/quotes.json"),
    JSON.stringify(
      {
        schema_version: 1,
        note:
          "Generated from arthur/index/quotes.json by scripts/ingest/build-quote-anchors.mjs. " +
          "Every entry has been located in its source text; `spine` is where it sits in the " +
          "reading text, when the portal publishes that work.",
        built_at: new Date().toISOString().slice(0, 10),
        counts: { total: out.length, placed, unplaceable },
        quotes: out,
      },
      null,
      1
    ) + "\n"
  );

  await writeFile(
    resolve(ROOT, "data/attestations.json"),
    JSON.stringify(
      {
        schema_version: 1,
        note:
          "Validation records for quotations whose source text is in copyright and therefore not " +
          "committed to this repository (see DECISIONS.md ADR-0004). Each record proves the " +
          "quotation was located in the source when the text was available; CI verifies the " +
          "quotation text still hashes to the attested value.",
        attestations,
      },
      null,
      2
    ) + "\n"
  );

  console.log(
    `Quotes: ${out.length} validated, ${placed} placed on the reading spine, ${unplaceable} not placeable (edition differs or work not published).`
  );
  if (Object.keys(attestations).length)
    console.log(`  ${Object.keys(attestations).length} attestation(s) for restricted sources.`);
  if (problems.length) {
    console.error(`\n${problems.length} FAILURE(S):`);
    for (const p of problems) console.error("  ✗ " + p);
    process.exit(1);
  }
}

// `require` is used for a large synchronous read inside a helper; declare it.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
