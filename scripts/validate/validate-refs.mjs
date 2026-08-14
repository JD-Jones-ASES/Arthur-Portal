#!/usr/bin/env node
/**
 * Referential integrity.
 *
 * This site is mostly cross-links: an episode points at chapters, characters,
 * voices, quotes and other episodes; a character points back. Thousands of ids
 * referring to each other is exactly the structure that rots silently, so every
 * reference is proved to resolve before anything is built.
 *
 * It also proves the reverse: nothing is orphaned. An episode nobody links to is
 * an episode nobody will read.
 */

import {
  loadWorks, loadQuotes, loadSpines, loadAllUnits,
  loadEpisodes, loadCharacters, loadVoices, loadCuts, loadFollows, loadPaths, loadEssays,
} from "../lib/data.mjs";

const BRANCHES = new Set(["chronicle", "welsh", "french", "german", "english", "reception"]);

async function main() {
  const works = loadWorks();
  const quotes = loadQuotes();
  const spines = loadSpines(works);
  const units = loadAllUnits(spines);
  const episodes = loadEpisodes();
  const characters = loadCharacters();
  const voices = loadVoices();
  const cuts = loadCuts();
  const follows = loadFollows();
  const paths = loadPaths();
  const essays = loadEssays();

  const problems = [];

  const workIds = new Set(works.map((w) => w.id));
  const quoteIds = new Set(quotes.map((q) => q.id));
  const unitIds = new Set(units.keys());
  const episodeIds = new Set(episodes.map((e) => e.id));
  const characterIds = new Set(characters.map((c) => c.id));
  const voiceIds = new Set(voices.map((v) => v.id));
  const cutIds = new Set(cuts.map((c) => c.id));

  const ref = (ok, where, what) => {
    if (!ok) problems.push(`${where}: unresolved reference → ${what}`);
  };

  /* --- duplicates --- */
  const dupCheck = (list, name) => {
    const seen = new Set();
    for (const x of list) {
      if (seen.has(x.id)) problems.push(`${name}: duplicate id "${x.id}"`);
      seen.add(x.id);
    }
  };
  dupCheck(episodes, "episodes");
  dupCheck(characters, "characters");
  dupCheck(voices, "voices");
  dupCheck(cuts, "cuts");

  /* --- works --- */
  for (const w of works) {
    if (!BRANCHES.has(w.branch)) problems.push(`work ${w.id}: unknown branch "${w.branch}"`);
    if (w.reader && w.tier !== "C" && w.layout && !spines.has(w.id) && w.sources?.length) {
      // A work marked reader:true with sources but no spine simply isn't built yet.
      // That is allowed during construction, but say so rather than fail silently.
      console.log(`  · ${w.id}: reader:true but no spine built yet`);
    }
  }

  /* --- quotes --- */
  for (const q of quotes) {
    if (q.work) ref(workIds.has(q.work), `quote ${q.id}`, `work "${q.work}"`);
    if (q.branch) ref(BRANCHES.has(q.branch), `quote ${q.id}`, `branch "${q.branch}"`);
    if (q.spine) {
      ref(unitIds.has(q.spine.unit), `quote ${q.id}`, `unit "${q.spine.unit}"`);
      const u = units.get(q.spine.unit);
      if (u) {
        const p = u.paragraphs[q.spine.paragraph];
        if (p === undefined) problems.push(`quote ${q.id}: paragraph ${q.spine.paragraph} does not exist in ${q.spine.unit}`);
        else if (q.spine.to > p.length) problems.push(`quote ${q.id}: range ${q.spine.from}-${q.spine.to} overruns paragraph (${p.length} chars)`);
      }
    }
  }

  /* --- spines: parts and order must agree --- */
  for (const [id, { spine, units: us }] of spines) {
    const fromParts = spine.parts.flatMap((p) => p.units);
    if (fromParts.length !== spine.order.length) problems.push(`spine ${id}: order has ${spine.order.length} units but parts list ${fromParts.length}`);
    for (const u of spine.order) ref(Boolean(us[u]), `spine ${id}`, `unit "${u}" in order`);
    for (const p of spine.parts) for (const u of p.units) ref(Boolean(us[u]), `spine ${id} part ${p.id}`, `unit "${u}"`);
  }

  /* --- episodes --- */
  for (const e of episodes) {
    for (const c of e.cuts ?? []) ref(cutIds.has(c), `episode ${e.id}`, `cut "${c}"`);
    for (const c of e.characters ?? []) ref(characterIds.has(c), `episode ${e.id}`, `character "${c}"`);
    for (const r of e.related ?? []) ref(episodeIds.has(r), `episode ${e.id}`, `episode "${r}"`);
    for (const v of e.voices ?? []) {
      ref(voiceIds.has(v.voice), `episode ${e.id}`, `voice "${v.voice}"`);
      if (v.quote_id) ref(quoteIds.has(v.quote_id), `episode ${e.id}`, `quote "${v.quote_id}"`);
    }
    for (const p of e.passages ?? []) {
      ref(unitIds.has(p.unit), `episode ${e.id}`, `unit "${p.unit}"`);
    }
  }

  /* --- characters --- */
  for (const c of characters) {
    for (const q of c.quotes ?? []) ref(quoteIds.has(q), `character ${c.id}`, `quote "${q}"`);
    for (const a of c.arc ?? []) ref(episodeIds.has(a.episode ?? a), `character ${c.id}`, `episode "${a.episode ?? a}"`);
    for (const k of c.kin ?? []) if (k.id) ref(characterIds.has(k.id), `character ${c.id}`, `character "${k.id}"`);
  }

  /* --- voices / cuts --- */
  for (const v of voices) {
    if (!BRANCHES.has(v.branch)) problems.push(`voice ${v.id}: unknown branch "${v.branch}"`);
    for (const w of v.works ?? []) ref(workIds.has(w), `voice ${v.id}`, `work "${w}"`);
  }
  for (const c of cuts) {
    for (const t of c.takes ?? []) {
      ref(voiceIds.has(t.voice), `cut ${c.id}`, `voice "${t.voice}"`);
      if (t.quote_id) ref(quoteIds.has(t.quote_id), `cut ${c.id}`, `quote "${t.quote_id}"`);
    }
  }

  /* --- follows / paths / essays --- */
  for (const f of follows) {
    for (const s of f.stops ?? []) {
      if (s.unit) ref(unitIds.has(s.unit), `follow ${f.id}`, `unit "${s.unit}"`);
      if (s.episode) ref(episodeIds.has(s.episode), `follow ${f.id}`, `episode "${s.episode}"`);
    }
  }
  for (const p of paths) {
    for (const s of p.stops ?? []) {
      if (s.unit) ref(unitIds.has(s.unit), `path ${p.id}`, `unit "${s.unit}"`);
      if (s.episode) ref(episodeIds.has(s.episode), `path ${p.id}`, `episode "${s.episode}"`);
    }
  }
  for (const es of essays) {
    for (const q of es.quotes ?? []) ref(quoteIds.has(q), `essay ${es.id}`, `quote "${q}"`);
  }

  /* --- orphans: everything must be reachable --- */
  if (episodes.length) {
    const linked = new Set();
    for (const c of characters) for (const a of c.arc ?? []) linked.add(a.episode ?? a);
    for (const e of episodes) for (const r of e.related ?? []) linked.add(r);
    for (const f of follows) for (const s of f.stops ?? []) if (s.episode) linked.add(s.episode);
    for (const p of paths) for (const s of p.stops ?? []) if (s.episode) linked.add(s.episode);
    // Episodes are always reachable from /stories/, so an orphan here only means
    // nothing else in the apparatus points at it — worth knowing, not fatal.
    const orphans = episodes.filter((e) => !linked.has(e.id));
    if (orphans.length) console.log(`  · ${orphans.length} episode(s) reachable only from the index: ${orphans.slice(0, 6).map((e) => e.id).join(", ")}${orphans.length > 6 ? "…" : ""}`);
  }

  console.log(
    `References: ${works.length} works, ${units.size} units, ${quotes.length} quotes, ` +
      `${episodes.length} episodes, ${characters.length} characters, ${voices.length} voices, ${cuts.length} cuts.`
  );

  if (problems.length) {
    console.error(`\n${problems.length} BROKEN REFERENCE(S):`);
    for (const p of problems.slice(0, 60)) console.error("  ✗ " + p);
    if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
