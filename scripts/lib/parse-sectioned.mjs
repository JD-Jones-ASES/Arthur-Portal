/**
 * A configurable parser for every text that is not Malory.
 *
 * These editions differ enormously in how much structure they carry. Weston's
 * Gawain has the translator's own marginal headings running through the prose;
 * Perlesvaus is divided into branches and titles; Tennyson's Idylls are twelve
 * named poems; Mason's Layamon is one continuous stream of narrative with no
 * divisions at all.
 *
 * So the parser does two things, and is explicit about which one it did:
 *
 *   - where the source supplies headings, they become the reading units, and
 *     the unit is marked `divisions: "source"`.
 *   - where it does not, the text is cut at paragraph boundaries into units of
 *     roughly a comfortable reading length, and the unit is marked
 *     `divisions: "editorial"` so the reader is told the breaks are ours.
 *
 * That distinction is surfaced in the UI. Inventing chapter divisions and
 * presenting them as the author's would be exactly the kind of quiet
 * misrepresentation this project exists to avoid.
 */

import { squash, toRoman } from "./text.mjs";

const rx = (pattern, flags = "g") => new RegExp(pattern, flags);

/** Split a block into paragraphs, lifting Gutenberg italics into ranges. */
function paragraphise(block, opts = {}) {
  const drop = opts.dropRx ? rx(opts.dropRx, "g") : null;
  const out = [];
  const em = {};

  let blocks = block
    .split(/\n[ \t]*\n+/)
    .map((p) => squash(p))
    .filter(Boolean);

  if (drop) blocks = blocks.filter((p) => !(drop.lastIndex = 0, drop.test(p)));

  for (const p of blocks) {
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
    if (!plain.trim()) continue;
    if (ranges.length) em[out.length] = ranges;
    out.push(plain);
  }
  return { paragraphs: out, em };
}

const words = (ps) => ps.reduce((n, p) => n + p.split(/\s+/).length, 0);

/** Cut a run of paragraphs into units of roughly `target` words. */
function chunk(paragraphs, em, target) {
  const units = [];
  let cur = [];
  let curEm = {};
  let n = 0;
  paragraphs.forEach((p, i) => {
    if (em[i]) curEm[cur.length] = em[i];
    cur.push(p);
    n += p.split(/\s+/).length;
    if (n >= target) {
      units.push({ paragraphs: cur, em: curEm });
      cur = [];
      curEm = {};
      n = 0;
    }
  });
  if (cur.length) {
    // Fold a stub tail into the previous unit rather than leaving an orphan.
    if (units.length && words(cur) < target * 0.35) {
      const last = units[units.length - 1];
      for (const [k, v] of Object.entries(curEm)) last.em[last.paragraphs.length + Number(k)] = v;
      last.paragraphs.push(...cur);
    } else {
      units.push({ paragraphs: cur, em: curEm });
    }
  }
  return units;
}

/**
 * @param {Array<{text:string, meta:object}>} sources
 * @param {object} work  the works.config.json entry, whose `parse` block configures this
 */
export function parseSectioned(sources, work) {
  const cfg = work.parse ?? {};
  const log = [];
  const parts = [];
  const units = {};
  let partSeq = 0;

  for (const { text: raw, meta } of sources) {
    let text = raw;

    if (cfg.bodyStart) {
      const m = rx(cfg.bodyStart, "").exec(text);
      if (!m) throw new Error(`${work.id}/${meta.file}: bodyStart did not match`);
      text = text.slice(m.index + (cfg.bodyStartAfter ? m[0].length : 0));
    }
    if (cfg.bodyEnd) {
      const m = rx(cfg.bodyEnd, "").exec(text);
      if (m) text = text.slice(0, m.index);
    }

    /* --- part boundaries --- */
    let partBlocks;
    if (cfg.parts?.rx) {
      const marks = [...text.matchAll(rx(cfg.parts.rx, "g"))];
      if (!marks.length) throw new Error(`${work.id}/${meta.file}: no parts matched`);
      partBlocks = marks.map((m, i) => {
        let body = text.slice(m.index + m[0].length, marks[i + 1]?.index ?? text.length);
        // Some editions interleave apparatus between the works — Comfort prints
        // each romance's endnotes directly after it — so a part may need its own
        // tail trimmed rather than one cut at the end of the file.
        if (cfg.parts.trimAt) {
          const t = rx(cfg.parts.trimAt, "").exec(body);
          if (t) body = body.slice(0, t.index);
        }
        return {
          label: (cfg.parts.label ?? "$1").replace(/\$(\d)/g, (_, d) => squash(m[Number(d)] ?? "")),
          body,
        };
      });
      if (cfg.parts.only) {
        const keep = new Set(cfg.parts.only);
        partBlocks = partBlocks.filter((p) => keep.has(p.label));
      }
    } else {
      partBlocks = [{ label: cfg.singlePartLabel ?? work.short, body: text }];
    }

    for (const pb of partBlocks) {
      partSeq++;
      const partId = `${work.id}-pt-${partSeq}`;
      const part = {
        id: partId,
        work: work.id,
        label: pb.label,
        roman: null,
        n: partSeq,
        units: [],
      };

      /* --- units within the part --- */
      let unitBlocks;
      let divisions;
      if (cfg.units?.rx) {
        const marks = [...pb.body.matchAll(rx(cfg.units.rx, "g"))];
        if (marks.length) {
          divisions = "source";
          const preamble = pb.body.slice(0, marks[0].index);
          unitBlocks = marks.map((m, i) => ({
            title: squash(m[1] ?? ""),
            body: pb.body.slice(m.index + m[0].length, marks[i + 1]?.index ?? pb.body.length),
          }));
          if (squash(preamble).length > 400) {
            unitBlocks.unshift({ title: cfg.preambleTitle ?? "Opening", body: preamble });
          }
        }
      }

      if (!unitBlocks) {
        divisions = "editorial";
        const { paragraphs, em } = paragraphise(pb.body, cfg);
        const chunks = chunk(paragraphs, em, cfg.chunkWords ?? 900);
        unitBlocks = chunks.map((c, i) => ({
          title: `${pb.label}, part ${i + 1} of ${chunks.length}`,
          _pre: c,
        }));
        log.push({
          work: work.id,
          part: pb.label,
          issue: "editorial-divisions",
          action: `the source has no internal divisions here; the text was cut at paragraph boundaries into ${chunks.length} reading unit(s) of roughly ${cfg.chunkWords ?? 900} words`,
        });
      }

      unitBlocks.forEach((ub, i) => {
        const id = `${work.id}-${partSeq}-${i + 1}`;
        const { paragraphs: ps, em } = ub._pre ?? paragraphise(ub.body, cfg);
        if (!ps.length) return;
        units[id] = {
          id,
          work: work.id,
          part: partId,
          label: cfg.parts?.rx ? `${pb.label} · ${i + 1}` : `${i + 1}`,
          book: pb.label,
          bookN: partSeq,
          chapter: toRoman(i + 1),
          chapterN: i + 1,
          title: ub.title,
          divisions,
          paragraphs: ps,
          ...(Object.keys(em).length ? { em } : {}),
        };
        part.units.push(id);
      });

      if (part.units.length) parts.push(part);
      else partSeq--;
    }
  }

  return { parts, units, log };
}
