#!/usr/bin/env node
/**
 * Editorial coverage — the standards from AGENTS.md, enforced rather than hoped for.
 *
 * Three of the research base's house constraints are checkable by machine, so
 * they are checked:
 *
 *   1. NAME THE VERSION. An episode must attribute its account to at least one
 *      voice. An unattributed retelling is the cardinal sin of Arthurian writing.
 *   2. COUNT THE COST. Every episode and every throughline must say what its
 *      subject depletes. This is the canon's load-bearing thesis and the thing
 *      that most easily gets dropped when you are tired.
 *   3. QUOTE OR DECLARE. A voice's take carries either a validated quotation or
 *      an explicit note saying why it doesn't. Silence is not allowed.
 *
 * Plus the structural minimum: an episode must point at real primary text.
 */

import {
  loadEpisodes, loadCharacters, loadCuts, loadVoices, loadWorks, loadAllUnits,
} from "../lib/data.mjs";

const MIN_RETELLING_WORDS = 180;

async function main() {
  const episodes = loadEpisodes();
  const characters = loadCharacters();
  const cuts = loadCuts();
  const voices = loadVoices();
  const works = loadWorks();
  const units = loadAllUnits();

  const problems = [];
  const warnings = [];

  /* --- episodes --- */
  for (const e of episodes) {
    const where = `episode ${e.id}`;

    if (!e.cost || e.cost.trim().length < 40) {
      problems.push(`${where}: no "what it costs" — House Constraint 2 requires every motif be asked what it depletes`);
    }
    if (!e.voices?.length) {
      problems.push(`${where}: no voice attributed — House Constraint 1 forbids an unattributed account`);
    }
    for (const v of e.voices ?? []) {
      if (!v.quote_id && !v.gap_note) {
        problems.push(`${where}: voice "${v.voice}" has neither a validated quote nor a gap_note (quote or declare)`);
      }
      if (!v.take || v.take.trim().length < 20) {
        problems.push(`${where}: voice "${v.voice}" has no substantive take`);
      }
    }
    if (!e.passages?.length) {
      problems.push(`${where}: no primary passage — a retelling must point at the text it retells`);
    }
    const words = (e.retelling ?? "").split(/\s+/).filter(Boolean).length;
    if (words < MIN_RETELLING_WORDS) {
      problems.push(`${where}: retelling is ${words} words (minimum ${MIN_RETELLING_WORDS})`);
    }
    if (!e.summary || e.summary.length < 20) problems.push(`${where}: no one-line summary`);
    if (!e.act) problems.push(`${where}: no act`);
  }

  /* --- throughlines (the seven cuts) --- */
  for (const c of cuts) {
    const where = `cut ${c.id}`;
    if (!c.cost || c.cost.trim().length < 40) problems.push(`${where}: no "what it costs"`);
    if ((c.takes ?? []).length < 3) {
      problems.push(`${where}: only ${(c.takes ?? []).length} voice(s) — a throughline needs at least 3 to show divergence`);
    }
    for (const t of c.takes ?? []) {
      if (!t.quote_id && !t.gap_note) problems.push(`${where}: voice "${t.voice}" has neither a quote nor a gap_note`);
    }
  }

  /* --- characters --- */
  for (const c of characters) {
    const where = `character ${c.id}`;
    if (!c.one_line || c.one_line.length < 15) problems.push(`${where}: no one-line description`);
    if (!c.traditions?.length) problems.push(`${where}: no traditions listed — which branches is this figure in?`);
    if (c.rank === "principal") {
      if ((c.arc ?? []).length < 3) problems.push(`${where}: a principal figure needs at least 3 arc stops, has ${(c.arc ?? []).length}`);
      const words = (c.dossier ?? "").split(/\s+/).filter(Boolean).length;
      if (words < 200) problems.push(`${where}: dossier is ${words} words (principal figures need 200+)`);
    }
  }

  /* --- voices --- */
  for (const v of voices) {
    if (!v.invented && !v.inherited) warnings.push(`voice ${v.id}: says neither what it invented nor what it inherited`);
  }

  /* --- works: a published work should be reachable --- */
  const readerWorks = works.filter((w) => w.reader);
  for (const w of readerWorks) {
    const has = [...units.values()].some((u) => u.work === w.id);
    if (!has) warnings.push(`work ${w.id}: reader:true but no units built yet`);
  }

  console.log(
    `Coverage: ${episodes.length} episodes, ${cuts.length} throughlines, ${characters.length} characters, ${voices.length} voices.`
  );
  for (const w of warnings) console.log("  · " + w);

  if (problems.length) {
    console.error(`\n${problems.length} COVERAGE FAILURE(S):`);
    for (const p of problems.slice(0, 60)) console.error("  ✗ " + p);
    if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
