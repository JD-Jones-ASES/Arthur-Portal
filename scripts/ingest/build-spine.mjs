#!/usr/bin/env node
/**
 * Build the reading spine: raw/ source text -> derived/<work>/{spine,units}.json
 *
 *   node scripts/ingest/build-spine.mjs [--only malory,gawain]
 *
 * The spine is what every anchor on this site resolves against. The transform is
 * deterministic and every editorial decision is written to a cleanup log, so a
 * reviewer can see exactly what was changed and why.
 *
 * Why not use the research base's corpus? Because `arthur/index/_corpus/*.txt` is
 * whitespace-flattened — one long line per work, no paragraphs. It is an excellent
 * search substrate and a hopeless reading text. So the corpus stays as the
 * quote-validation substrate and the spine is rebuilt from the original editions.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { stripGutenberg, squash, toRoman, fromRoman } from "../lib/text.mjs";
import { parseSectioned } from "../lib/parse-sectioned.mjs";

const ROOT = process.cwd();
const RAW = resolve(ROOT, "raw");
const DERIVED = resolve(ROOT, "derived");

const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(",")) : null;

/* ------------------------------------------------------------------ helpers */

/**
 * Split a block of hard-wrapped prose into paragraphs.
 *
 * Project Gutenberg marks italics with underscores (`_Hic jacet Arthurus…_`).
 * In the Morte these are never decorative — they are Caxton's book colophons and
 * the epitaph on Arthur's tomb, the single most quoted line in the canon. So the
 * markers are lifted out into character ranges rather than discarded: the
 * paragraph stays plain text (which keeps every quote and glossary offset simple),
 * and the emphasis is reapplied at render time alongside the other overlays.
 *
 * Returns { paragraphs: string[], em: { [index]: [start, end][] }.
 */
function paragraphs(block) {
  const out = [];
  const em = {};
  const blocks = block.split(/\n[ \t]*\n+/).map((p) => squash(p)).filter(Boolean);

  blocks.forEach((p) => {
    const ranges = [];
    let plain = "";
    let i = 0;
    while (i < p.length) {
      if (p[i] === "_") {
        const close = p.indexOf("_", i + 1);
        if (close > -1) {
          const inner = p.slice(i + 1, close);
          ranges.push([plain.length, plain.length + inner.length]);
          plain += inner;
          i = close + 1;
          continue;
        }
      }
      plain += p[i];
      i++;
    }
    if (ranges.length) em[out.length] = ranges;
    out.push(plain);
  });

  return { paragraphs: out, em };
}

const titleKey = (s) => squash(s).toLowerCase().replace(/[^a-z0-9 ]/g, "");

/* ------------------------------------------------------- layout: malory ---- */

/**
 * Caxton's Morte is printed as 21 books of numbered chapters, each chapter
 * carrying a descriptive rubric ("How Arthur was chosen king…"). Those rubrics
 * are the single most useful navigational asset in the book, so they become the
 * unit titles.
 *
 * The Project Gutenberg edition has real defects: five chapter headings are
 * dropped outright, one is missing its full stop, and two numerals in Book IX
 * are mistyped (XXVIII for XXXVIII, XIX for XXXIX). Numbering the units by the
 * printed numeral would therefore produce duplicate and wrong citations.
 *
 * So the body headings are matched to the volume's own table of contents BY
 * TITLE, and the TOC supplies the authoritative chapter number. Every mismatch
 * is written to the cleanup log.
 */
function parseMalory(sources, work) {
  const log = [];
  const parts = [];
  const units = {};

  for (const { text, meta } of sources) {
    const bodyStart = text.search(/\nBOOK [IVXL]+\.\s*\n/);
    if (bodyStart < 0) throw new Error(`${meta.file}: no BOOK heading found`);

    const front = text.slice(0, bodyStart);
    // The volumes reprint a shared glossary after the last chapter; it is lifted
    // separately by build-glossary.mjs and must not bleed into the final unit.
    const glossIdx = text.indexOf("\nGLOSSARY\n", bodyStart);
    const body = text.slice(bodyStart, glossIdx > -1 ? glossIdx : undefined);

    /* --- 1. the volume's table of contents: the authoritative chapter list --- */
    const toc = new Map(); // book -> [{ num, title }]
    {
      let currentBook = null;
      const lines = front.split("\n");
      let buf = null;
      const flush = () => {
        if (!buf) return;
        const m = /^CHAPTER ([IVXLC]+)\.?\s+([\s\S]+)$/.exec(squash(buf.raw));
        if (m && currentBook) {
          if (!toc.has(currentBook)) toc.set(currentBook, []);
          toc.get(currentBook).push({ num: m[1], title: squash(m[2]) });
        }
        buf = null;
      };
      for (const line of lines) {
        const b = /^\s*BOOK ([IVXL]+)\.\s*$/.exec(line);
        if (b) {
          flush();
          currentBook = b[1];
          continue;
        }
        if (/^\s*CHAPTER [IVXLC]+\.?\s/.test(line)) {
          flush();
          buf = { raw: line.trim() };
        } else if (buf && line.trim()) {
          buf.raw += " " + line.trim();
        } else {
          flush();
        }
      }
      flush();
    }

    /* --- 2. the body: book and chapter headings at column 0 --- */
    const marks = [];
    for (const m of body.matchAll(/\nBOOK ([IVXL]+)\.\s*\n/g)) {
      marks.push({ kind: "book", num: m[1], at: m.index, end: m.index + m[0].length });
    }
    // The full stop after the numeral is optional: PG's Book III chapter VII
    // is printed "CHAPTER VII How the hart was chased…".
    for (const m of body.matchAll(/\nCHAPTER ([IVXLC]+)\.?[ \t]+((?:[^\n]+\n)+?)[ \t]*\n/g)) {
      marks.push({
        kind: "chapter",
        num: m[1],
        title: squash(m[2]),
        at: m.index,
        end: m.index + m[0].length,
      });
    }
    marks.sort((a, b) => a.at - b.at);

    /* --- 3. reconcile body headings against the TOC, by title --- */
    let book = null;
    let tocList = null;
    let tocIdx = 0;
    let lastChapterN = 0;

    for (let i = 0; i < marks.length; i++) {
      const mk = marks[i];
      if (mk.kind === "book") {
        book = mk.num;
        tocList = toc.get(book) ?? [];
        tocIdx = 0;
        lastChapterN = 0;
        parts.push({
          id: `${work.id}-bk-${fromRoman(book)}`,
          work: work.id,
          label: `Book ${book}`,
          roman: book,
          n: fromRoman(book),
          units: [],
        });
        continue;
      }
      if (!book) continue;

      const stop = marks[i + 1] ? marks[i + 1].at : body.length;
      const raw = body.slice(mk.end, stop);

      // Find this heading in the TOC, searching forward from where we are.
      const key = titleKey(mk.title);
      let found = -1;
      for (let k = tocIdx; k < tocList.length; k++) {
        if (titleKey(tocList[k].title) === key) {
          found = k;
          break;
        }
      }
      if (found === -1) {
        // Fall back to a prefix match — a handful of TOC rubrics are truncated.
        for (let k = tocIdx; k < tocList.length; k++) {
          const a = titleKey(tocList[k].title);
          if (a.startsWith(key.slice(0, 40)) || key.startsWith(a.slice(0, 40))) {
            found = k;
            break;
          }
        }
      }

      const skipped = [];
      let tocNum = null;
      if (found === -1) {
        log.push({
          work: work.id,
          book,
          issue: "body-heading-not-in-toc",
          printed: mk.num,
          title: mk.title,
          action: "no table-of-contents entry; reconciled against the chapter sequence",
        });
      } else {
        for (let k = tocIdx; k < found; k++) skipped.push(tocList[k]);
        tocNum = tocList[found].num;
        tocIdx = found + 1;
      }

      // Both the printed heading and the table of contents contain numeral typos,
      // and they are not the same typos: the body prints XXVIII for XXXVIII in
      // Book IX, the contents print XXI for XXX in Book X. Neither source can be
      // trusted alone, so take whichever candidate continues the chapter sequence,
      // and if neither does, reconstruct from the sequence itself. Chapter numbers
      // are citation handles — a duplicate or an out-of-order one is a broken
      // citation, so this is resolved here rather than left to the reader.
      const expected = lastChapterN + 1;
      const candidates = [...new Set([tocNum, mk.num].filter(Boolean))];
      let num = candidates.find((c) => fromRoman(c) === expected);
      if (!num) {
        const forward = candidates.filter((c) => fromRoman(c) > lastChapterN);
        if (forward.length === 1) {
          num = forward[0];
          log.push({
            work: work.id,
            book,
            issue: "numeral-disagreement",
            printed: mk.num,
            contents: tocNum,
            chosen: num,
            title: mk.title,
            action: "took the only candidate that advances the sequence",
          });
        } else {
          num = toRoman(expected).toUpperCase();
          log.push({
            work: work.id,
            book,
            issue: "numeral-reconstructed",
            printed: mk.num,
            contents: tocNum,
            chosen: num,
            title: mk.title,
            action: "neither the printed numeral nor the contents continues the sequence",
          });
        }
      } else if (num !== mk.num) {
        log.push({
          work: work.id,
          book,
          issue: "printed-numeral-corrected",
          printed: mk.num,
          contents: tocNum,
          chosen: num,
          title: mk.title,
          action: "the printed numeral breaks sequence; used the table of contents",
        });
      }

      const n = fromRoman(num);
      lastChapterN = n;
      const id = `${work.id}-${fromRoman(book)}-${n}`;
      const part = parts[parts.length - 1];

      // Any TOC chapters jumped over have no heading in the body: their text runs
      // on inside this unit. Record that rather than inventing a division.
      const absorbed = skipped.map((s) => ({ num: s.num, title: s.title }));
      for (const s of skipped) {
        log.push({
          work: work.id,
          book,
          issue: "chapter-heading-missing-in-source",
          chapter: s.num,
          title: s.title,
          action: `text runs on inside ${book}.${num.toLowerCase()} — recorded, not split`,
        });
      }

      units[id] = {
        id,
        work: work.id,
        part: part.id,
        label: `${book}.${num.toLowerCase()}`,
        book,
        bookN: fromRoman(book),
        chapter: num.toLowerCase(),
        chapterN: n,
        title: mk.title,
        ...(() => {
          const { paragraphs: ps, em } = paragraphs(raw);
          return Object.keys(em).length ? { paragraphs: ps, em } : { paragraphs: ps };
        })(),
        ...(absorbed.length ? { absorbs: absorbed } : {}),
      };
      part.units.push(id);
    }

    /* --- 4. Caxton's preface: the book's own statement of purpose --- */
    const prefIdx = front.indexOf("PREFACE OF WILLIAM CAXTON", 2000);
    if (prefIdx > -1 && !units[`${work.id}-front-caxton`]) {
      const prefBody = front.slice(prefIdx + "PREFACE OF WILLIAM CAXTON".length);
      parts.unshift({
        id: `${work.id}-front`,
        work: work.id,
        label: "Front matter",
        roman: null,
        n: 0,
        units: [`${work.id}-front-caxton`],
      });
      units[`${work.id}-front-caxton`] = {
        id: `${work.id}-front-caxton`,
        work: work.id,
        part: `${work.id}-front`,
        label: "Caxton's preface",
        book: null,
        bookN: 0,
        chapter: null,
        chapterN: 0,
        title: "The preface of William Caxton",
        ...(() => {
          const { paragraphs: ps, em } = paragraphs(prefBody);
          return Object.keys(em).length ? { paragraphs: ps, em } : { paragraphs: ps };
        })(),
      };
    }
  }

  return { parts, units, log };
}

/* ------------------------------------------------------------------- main */

const LAYOUTS = { malory: parseMalory, sectioned: parseSectioned };

async function main() {
  const config = JSON.parse(await readFile(resolve(ROOT, "data/works/works.config.json"), "utf8"));
  await mkdir(DERIVED, { recursive: true });

  const summary = [];

  for (const work of config.works) {
    if (ONLY && !ONLY.has(work.id)) continue;
    if (!work.reader || !work.sources?.length) continue;
    const parser = LAYOUTS[work.layout];
    if (!parser) {
      console.log(`  · ${work.id}: layout "${work.layout}" not implemented yet — skipped`);
      continue;
    }

    const sources = [];
    for (const src of work.sources) {
      const p = join(RAW, src.file);
      if (!existsSync(p)) throw new Error(`missing ${p} — run \`npm run fetch:sources\``);
      sources.push({ meta: src, text: stripGutenberg(await readFile(p, "utf8")) });
    }

    const { parts, units, log } = parser(sources, work);

    // Fail loud on anything that would produce a broken citation. Unit ids are
    // public URLs and quote anchors; a duplicate or out-of-order chapter is a bug
    // that must never reach the site.
    const seen = new Set();
    for (const part of parts) {
      let prev = -1;
      for (const id of part.units) {
        if (seen.has(id)) throw new Error(`${work.id}: duplicate unit id ${id}`);
        seen.add(id);
        const n = units[id].chapterN;
        if (n <= prev) {
          throw new Error(
            `${work.id}: chapter numbers out of order in ${part.label} — ${units[id].label} follows ${prev}`
          );
        }
        prev = n;
        if (!units[id].paragraphs.length) throw new Error(`${work.id}: empty unit ${id}`);
      }
    }

    const dir = join(DERIVED, work.id);
    await mkdir(dir, { recursive: true });

    const order = parts.flatMap((p) => p.units);
    const words = order.reduce(
      (sum, id) => sum + units[id].paragraphs.reduce((s, p) => s + p.split(/\s+/).length, 0),
      0
    );

    await writeFile(
      join(dir, "spine.json"),
      JSON.stringify(
        {
          work: work.id,
          title: work.title,
          tier: work.tier,
          built_at: new Date().toISOString().slice(0, 10),
          n_parts: parts.length,
          n_units: order.length,
          words,
          parts: parts.map((p) => ({ ...p })),
          order,
        },
        null,
        2
      ) + "\n"
    );
    await writeFile(join(dir, "units.json"), JSON.stringify(units) + "\n");
    await writeFile(
      join(dir, "cleanup-log.json"),
      JSON.stringify(
        {
          work: work.id,
          note:
            "Every editorial decision taken while turning the source edition into the reading " +
            "spine. Nothing here is silent: a reviewer can check each one against the original.",
          entries: log,
        },
        null,
        2
      ) + "\n"
    );

    summary.push(`  ✓ ${work.id}: ${parts.length} part(s), ${order.length} unit(s), ${words.toLocaleString()} words, ${log.length} log entr(ies)`);
  }

  console.log("Reading spine:");
  for (const s of summary) console.log(s);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
