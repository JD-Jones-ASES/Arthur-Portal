#!/usr/bin/env node
/**
 * Cross-indexes: everything the pages need to look up quickly, computed once at
 * build time so no page ever scans the whole corpus.
 *
 *   data/indexes/quotes-by-unit.json     unit -> validated quotations sitting in it
 *   data/indexes/glossary-hits.json      unit -> where to gloss a Middle English word
 *   data/indexes/episodes-by-unit.json   unit -> episodes that retell it
 *   data/indexes/quotes-by-tag.json      tag  -> quotations
 *   data/indexes/stats.json              headline counts for the site
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { loadQuotes, loadGlossary, loadSpines, loadWorks, loadEpisodes } from "../lib/data.mjs";

const ROOT = process.cwd();
const OUT = resolve(ROOT, "data/indexes");

/**
 * Words that are glossed only when they appear in a form a modern reader can't
 * resolve. Matching is whole-word and case-insensitive, and a term is glossed at
 * most once per chapter — the convention of a printed student edition, and the
 * only way to keep a page from turning into a field of dotted underlines.
 */
function buildGlossaryMatcher(entries) {
  const byTerm = new Map();
  for (const e of entries) byTerm.set(e.match, e);

  // Longest first so "wood shaw" wins over "wood".
  const terms = [...byTerm.keys()].sort((a, b) => b.length - a.length);
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
  const rx = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return { rx, byTerm };
}

async function main() {
  const works = loadWorks();
  const quotes = loadQuotes();
  const glossary = loadGlossary();
  const spines = loadSpines(works);
  const episodes = loadEpisodes();

  await mkdir(OUT, { recursive: true });

  /* --- quotes by unit --- */
  const quotesByUnit = {};
  for (const q of quotes) {
    if (!q.spine) continue;
    (quotesByUnit[q.spine.unit] ??= []).push({
      id: q.id,
      paragraph: q.spine.paragraph,
      from: q.spine.from,
      to: q.spine.to,
      tags: q.tags,
      voice: q.voice,
    });
  }
  for (const list of Object.values(quotesByUnit)) {
    list.sort((a, b) => a.paragraph - b.paragraph || a.from - b.from);
  }

  /* --- quotes by tag --- */
  const quotesByTag = {};
  for (const q of quotes) for (const t of q.tags) (quotesByTag[t] ??= []).push(q.id);

  /* --- episodes by unit --- */
  const episodesByUnit = {};
  for (const e of episodes) {
    for (const p of e.passages ?? []) {
      (episodesByUnit[p.unit] ??= []).push({ id: e.id, title: e.title, why: p.why ?? null });
    }
  }

  /* --- glossary hits --- */
  const glossaryHits = {};
  let hitCount = 0;
  if (glossary.length) {
    const { rx, byTerm } = buildGlossaryMatcher(glossary);
    for (const [workId, { work, spine, units }] of spines) {
      // Only the Morte has a glossary of its own vocabulary; applying Malory's
      // glossary to a Victorian translation of Wolfram would be nonsense.
      if (workId !== "malory") continue;
      for (const id of spine.order) {
        const u = units[id];
        const seen = new Set();
        const hits = [];
        u.paragraphs.forEach((p, pi) => {
          rx.lastIndex = 0;
          let m;
          while ((m = rx.exec(p))) {
            const key = m[1].toLowerCase().replace(/\s+/g, " ");
            if (seen.has(key)) continue;
            const entry = byTerm.get(key);
            if (!entry) continue;
            seen.add(key);
            hits.push({ p: pi, from: m.index, to: m.index + m[1].length, term: entry.match });
            hitCount++;
          }
        });
        if (hits.length) {
          hits.sort((a, b) => a.p - b.p || a.from - b.from);
          glossaryHits[id] = hits;
        }
      }
    }
  }

  /* --- headline stats --- */
  const units = [...spines.values()].reduce((n, s) => n + s.spine.order.length, 0);
  const words = [...spines.values()].reduce((n, s) => n + (s.spine.words ?? 0), 0);
  const stats = {
    works_total: works.length,
    // Works that actually have a reading spine, not works we intend to set:
    // Geoffrey is marked reader:true but is not typeset yet, and counting it
    // would overstate what a visitor can open.
    works_readable: spines.size,
    works_planned: works.filter((w) => w.reader).length - spines.size,
    units,
    words,
    quotes: quotes.length,
    quotes_placed: quotes.filter((q) => q.spine).length,
    glossary: glossary.length,
    glossary_hits: hitCount,
    episodes: episodes.length,
    voices: new Set(works.map((w) => w.voice)).size,
  };

  const write = (name, data) => writeFile(resolve(OUT, name), JSON.stringify(data) + "\n");
  await write("quotes-by-unit.json", quotesByUnit);
  await write("quotes-by-tag.json", quotesByTag);
  await write("episodes-by-unit.json", episodesByUnit);
  await write("glossary-hits.json", glossaryHits);
  await writeFile(resolve(OUT, "stats.json"), JSON.stringify(stats, null, 2) + "\n");

  console.log(
    `Indexes: ${Object.keys(quotesByUnit).length} unit(s) with quotations, ` +
      `${Object.keys(glossaryHits).length} unit(s) with glosses (${hitCount} total), ` +
      `${Object.keys(quotesByTag).length} tag(s).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
