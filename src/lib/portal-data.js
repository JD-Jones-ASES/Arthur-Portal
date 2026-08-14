// Build-time data access. Everything is read from disk once and memoised, so a
// 500-page build reads each file exactly once.
//
// Files are read rather than imported so that large generated JSON never has to
// pass through the bundler.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const cache = new Map();

function load(path, fallback = null) {
  if (cache.has(path)) return cache.get(path);
  const full = resolve(ROOT, path);
  const value = existsSync(full) ? JSON.parse(readFileSync(full, "utf8")) : fallback;
  cache.set(path, value);
  return value;
}

function loadDir(dir) {
  const key = `dir:${dir}`;
  if (cache.has(key)) return cache.get(key);
  const full = resolve(ROOT, dir);
  const out = existsSync(full)
    ? readdirSync(full)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => JSON.parse(readFileSync(join(full, f), "utf8")))
    : [];
  cache.set(key, out);
  return out;
}

/* ------------------------------------------------------------------ works */

export const works = () => load("data/works/works.config.json", { works: [] }).works;
export const workById = (id) => works().find((w) => w.id === id) ?? null;
export const readableWorks = () => works().filter((w) => w.reader && hasSpine(w.id));

export const hasSpine = (id) => existsSync(resolve(ROOT, `derived/${id}/spine.json`));
export const spine = (id) => load(`derived/${id}/spine.json`);
export const units = (id) => load(`derived/${id}/units.json`, {});
export const cleanupLog = (id) => load(`derived/${id}/cleanup-log.json`, { entries: [] });

/** One reading unit, with its work and part attached. */
export function unit(workId, unitId) {
  const u = units(workId)[unitId];
  if (!u) return null;
  const sp = spine(workId);
  return { ...u, part: sp.parts.find((p) => p.id === u.part) ?? null };
}

/** Every unit of every readable work, as flat records for getStaticPaths. */
export function allReadingUnits() {
  const out = [];
  for (const w of readableWorks()) {
    const sp = spine(w.id);
    sp.order.forEach((id, i) => {
      out.push({
        work: w,
        unitId: id,
        index: i,
        prev: sp.order[i - 1] ?? null,
        next: sp.order[i + 1] ?? null,
        total: sp.order.length,
      });
    });
  }
  return out;
}

/* ----------------------------------------------------------------- quotes */

export const quotes = () => load("data/quotes.json", { quotes: [] }).quotes;
export const quoteById = (id) => quotes().find((q) => q.id === id) ?? null;
export const quotesByUnit = () => load("data/indexes/quotes-by-unit.json", {});
export const quotesByTag = () => load("data/indexes/quotes-by-tag.json", {});

/* --------------------------------------------------------------- glossary */

export const glossary = () => load("data/glossary/malory.json", { entries: [] });
export const glossaryHits = () => load("data/indexes/glossary-hits.json", {});

let _glossMap = null;
export function glossaryMap() {
  if (!_glossMap) _glossMap = new Map(glossary().entries.map((e) => [e.match, e]));
  return _glossMap;
}

/* -------------------------------------------------------------- apparatus */

export const episodes = () => loadDir("data/episodes");
export const characters = () => loadDir("data/characters");
export const voices = () => loadDir("data/voices");
export const cuts = () => loadDir("data/cuts");
export const follows = () => loadDir("data/follows");
export const paths = () => loadDir("data/paths");
export const essays = () => loadDir("data/essays");
export const episodesByUnit = () => load("data/indexes/episodes-by-unit.json", {});
export const stats = () => load("data/indexes/stats.json", {});

/* ------------------------------------------------------------------ Grail */

export const transmission = () => load("data/transmission.json", { edges: [], motifs: [] });

export const grailThread = () => load("data/grail/thread.json", { stops: [] });
export const grailVersions = () => load("data/grail/versions.json", { rows: [], columns: [] });
export const grailQuesters = () => load("data/grail/questers.json", { people: [] });
export const followById = (id) => follows().find((f) => f.id === id) ?? null;

export const voiceById = (id) => voices().find((v) => v.id === id) ?? null;
export const characterById = (id) => characters().find((c) => c.id === id) ?? null;
export const episodeById = (id) => episodes().find((e) => e.id === id) ?? null;
export const cutById = (id) => cuts().find((c) => c.id === id) ?? null;

/* ------------------------------------------------------------------- tags */

// The research base's controlled vocabulary (arthur/TAGS.md), as labels.
export const TAG_LABELS = {
  "source-of-rule": "The source of rule",
  "sword-and-sovereignty": "Sword & sovereignty",
  "the-fellowship": "The fellowship",
  "pentecostal-oath": "The Pentecostal Oath",
  "the-grail": "The Grail",
  "the-unasked-question": "The unasked question",
  "courtly-love": "Courtly love",
  "the-wound-and-wasteland": "The wound & the wasteland",
  "dolorous-stroke": "The Dolorous Stroke",
  "once-and-future": "Once and future",
  "foreknowledge-and-doom": "Foreknowledge & doom",
  disenchantment: "Disenchantment",
  "pseudo-history": "Pseudo-history",
  "the-chivalric-test": "The chivalric test",
  "the-cost": "The cost",
  "version-divergence": "Version divergence",
};

export const tagLabel = (t) => TAG_LABELS[t] ?? t;
