#!/usr/bin/env node
/**
 * Lift the glossary Caxton's editors printed at the end of each volume of the
 * Morte into structured data: data/glossary/malory.json.
 *
 * This is a genuine windfall. The Project Gutenberg edition ships a ~900-entry
 * glossary of Malory's Middle English vocabulary, in the public domain, keyed to
 * exactly the text this portal publishes. It becomes the reader's hover-gloss
 * layer, which is the single biggest lift for a first-time reader of the Morte.
 *
 * Entries are classified so the reader can choose how much help it wants:
 *   - "archaic"      — the word is simply gone from modern English (yede, wroken)
 *   - "false-friend" — the word survives but has changed meaning, so a modern
 *                      reader misreads it silently. These are the valuable ones:
 *                      "worship" = honour, "wood" = mad, "wonder" = wondrous.
 * A short stop-list drops entries whose glossing would be pure noise — function
 * words like "at", "of", "by".
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { stripGutenberg, squash } from "../lib/text.mjs";

const ROOT = process.cwd();

/**
 * Function words and words whose glossed sense is close enough to the modern one
 * that a tooltip would only get in the way. Kept deliberately short: a reader is
 * better served by too many glosses than by silently misreading a false friend.
 */
const STOPLIST = new Set([
  "at", "of", "by", "or", "so", "to", "as", "an", "and", "for", "in", "on", "up",
  "allow", "amounted", "araised", "areared", "arrayed", "become", "behests",
  "within-forth", "without-forth", "actually", "at-after",
]);

/** Terms whose head-word is a current English word => a false friend. */
function classify(term, gloss) {
  const head = term.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").split(/[\s,]/)[0];
  // A hyphen or an obviously obsolete shape is a strong archaic signal.
  if (/^(y-|a-)/.test(head) || head.includes("-")) return "archaic";
  // If the gloss simply restates the head word, it survives with a shifted sense.
  const g = gloss.toLowerCase();
  if (g.includes(head)) return "false-friend";
  return MODERN.has(head) ? "false-friend" : "archaic";
}

// A compact list of common modern English words. Built from the glossary's own
// definitions plus the obvious high-frequency vocabulary; the point is only to
// separate "you already know this word but not this sense" from "you have never
// seen this word", so it does not need to be exhaustive.
const MODERN = new Set(
  ("abate about above accord acquit advance affray after again against allow amount anger " +
   "answer appeal apparel approve arm army array arrive ask assay attaint avail avoid avow " +
   "await bachelor bain balance bare battle bawdy beam bear beholden bend bent beside bid " +
   "bind blame board boast bond book boot bound brace brake brand break breath bridle bring " +
   "buckle burn busy call carry cast cause chafe chamber charge chase cheer chief child " +
   "clean clear cleave close cloth come comfort common company complain conceit condition " +
   "counsel countenance course cover crave cry cunning curious daily damsel dare dead deal " +
   "dear defend degree deliver depart desire despite device devoir discover dispose divers " +
   "doubt draw dress drive earnest ease eft enter entreat errand estate even fain fair fall " +
   "fare fashion fast favour feat fell fellow fetch field fill fine flat flee force forfend " +
   "forth foul frame free fresh gentle gin glad govern grace grieve ground guise hand hap " +
   "hardy harness haste head heavy hold honest hurl issue jeopardy journey kind knowledge " +
   "lament large lay league lean leave let lie light like list long loose lord lust maintain " +
   "manner marvel mate mean meat meet mercy mete mickle might mind mischief moil mount move " +
   "naked nigh noble note nother office order out pain part pass passing peril piece pight " +
   "pity place plain play plight point port possess pray press prick prime prise prove purpose " +
   "purvey put quarrel quick quit raise range rank rate ravish reach ready rear reason recover " +
   "reckon recreant refrain rehearse relieve remove render rest retain rich ride right rule " +
   "sad sailing scape search season seat seek seem semblant sense serve set shame shape sharp " +
   "shift shrewd sign single sith slack sleight smart smite sore sound spare speed spell spill " +
   "sport stale stand stark start state stay stead stern still stint stir stomach store stound " +
   "straight strait strange stroke succour suffer sure swap sweven table take tall tarry teen " +
   "tell temper tender thrall throw tide tight touch train travail treat trow truage try turn " +
   "unhappy usage utter vail vantage venture very vessel virtue voided wage wait wallop wan " +
   "want war ward warn waste watch water wax weal wean weed weet weigh well wend what wield " +
   "wild will win wise wit withal wonder wood work worship worth wound wroth yield"
  ).split(" ")
);

/**
 * Three glossary lines are damaged in the source — a dropped comma and an OCR
 * scar. Repaired explicitly here rather than silently dropped, and the repairs
 * are reported on every run so they stay visible.
 *
 * ("Enbraid,", "Freshed," and "Rasure," carry no definition at all in the printed
 * glossary; those are genuinely defective entries and are left out.)
 */
const CORRECTIONS = new Map([
  ["Licours lecherous,", "Licours, lecherous,"],
  ["Mount~ lance, amount of, extent,", "Mountenance, amount of, extent,"],
]);

async function main() {
  const corrected = [];
  const raw = stripGutenberg(await readFile(resolve(ROOT, "raw/malory-2.txt"), "utf8"));
  const start = raw.lastIndexOf("\nGLOSSARY\n");
  if (start < 0) throw new Error("no GLOSSARY section found in raw/malory-2.txt");

  const block = raw.slice(start + "\nGLOSSARY\n".length);
  const entries = [];
  const seen = new Set();
  const skipped = [];

  for (const rawLine of block.split("\n")) {
    let s = squash(rawLine);
    if (!s) continue;
    if (CORRECTIONS.has(s)) {
      corrected.push({ from: s, to: CORRECTIONS.get(s) });
      s = CORRECTIONS.get(s);
    }
    // "Abashed, abased, lowered," — head word, then the gloss, then a stray comma.
    const m = /^([A-Za-z][A-Za-z'’\- ]*(?:\s*\([^)]*\))?[A-Za-z'’\- ]*)\s*,\s*(.+?)\s*[,;]?$/.exec(s);
    if (!m) {
      skipped.push(s);
      continue;
    }
    const term = squash(m[1]);
    // Tidy the gloss: the print convention leaves dangling separators behind.
    const gloss = squash(m[2])
      .replace(/\s*;\s*$/, "")
      .replace(/,\s*;\s*/g, "; ")
      .replace(/\s*,\s*$/, "");
    if (!gloss) {
      skipped.push(s);
      continue;
    }

    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // The head word as it will be matched in the text: drop parenthetical notes
    // ("Avail (at)") and grammatical labels ("Wonder, adj.").
    const match = term.replace(/\s*\([^)]*\)\s*/g, "").trim();
    if (!match || STOPLIST.has(match.toLowerCase())) continue;

    entries.push({
      term,
      match: match.toLowerCase(),
      gloss,
      kind: classify(match, gloss),
    });
  }

  entries.sort((a, b) => a.match.localeCompare(b.match));

  const out = {
    schema_version: 1,
    source: "Le Morte d'Arthur, Vol. II (Project Gutenberg #1252) — the editors' glossary",
    rights: "Public domain.",
    note:
      "The glossary printed at the end of the Caxton text, lifted verbatim. `kind` separates words " +
      "that have left the language ('archaic') from words that survive with a changed sense " +
      "('false-friend') — the second group is the one a modern reader misreads without noticing.",
    corrections: corrected,
    counts: {
      total: entries.length,
      archaic: entries.filter((e) => e.kind === "archaic").length,
      "false-friend": entries.filter((e) => e.kind === "false-friend").length,
    },
    entries,
  };

  await mkdir(resolve(ROOT, "data/glossary"), { recursive: true });
  await writeFile(resolve(ROOT, "data/glossary/malory.json"), JSON.stringify(out, null, 1) + "\n");

  console.log(
    `Glossary: ${entries.length} entries (${out.counts.archaic} archaic, ${out.counts["false-friend"]} false friends); ${skipped.length} line(s) unparsed`
  );
  if (corrected.length) {
    console.log(`  repaired ${corrected.length} damaged line(s):`);
    for (const c of corrected) console.log(`    "${c.from}" -> "${c.to}"`);
  }
  if (skipped.length) console.log("  no definition printed for:", skipped.slice(0, 8));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
