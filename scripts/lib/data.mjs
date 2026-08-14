/**
 * Shared loader for the build scripts. One place that knows where things live,
 * so a validator and an ingest stage can never disagree about the shape of the
 * world.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = process.cwd();

const read = (p) => JSON.parse(readFileSync(resolve(ROOT, p), "utf8"));
const maybe = (p) => (existsSync(resolve(ROOT, p)) ? read(p) : null);

/** Every .json in a directory, in filename order. Empty array if absent. */
export function loadDir(dir) {
  const full = resolve(ROOT, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({ file: join(dir, f), data: read(join(dir, f)) }));
}

export function loadWorks() {
  return read("data/works/works.config.json").works;
}

export function loadQuotes() {
  return maybe("data/quotes.json")?.quotes ?? [];
}

export function loadGlossary() {
  return maybe("data/glossary/malory.json")?.entries ?? [];
}

/** Reading spines, keyed by work id: { spine, units }. */
export function loadSpines(works = loadWorks()) {
  const out = new Map();
  for (const w of works) {
    const dir = `derived/${w.id}`;
    if (!existsSync(resolve(ROOT, dir, "spine.json"))) continue;
    out.set(w.id, {
      work: w,
      spine: read(join(dir, "spine.json")),
      units: read(join(dir, "units.json")),
    });
  }
  return out;
}

/** Every reading unit across every published work, keyed by unit id. */
export function loadAllUnits(spines = loadSpines()) {
  const out = new Map();
  for (const { units } of spines.values()) {
    for (const [id, u] of Object.entries(units)) out.set(id, u);
  }
  return out;
}

export const loadEpisodes = () => loadDir("data/episodes").map((x) => x.data);
export const loadCharacters = () => loadDir("data/characters").map((x) => x.data);
export const loadVoices = () => loadDir("data/voices").map((x) => x.data);
export const loadCuts = () => loadDir("data/cuts").map((x) => x.data);
export const loadFollows = () => loadDir("data/follows").map((x) => x.data);
export const loadPaths = () => loadDir("data/paths").map((x) => x.data);
export const loadEssays = () => loadDir("data/essays").map((x) => x.data);

export { ROOT, read, maybe };
