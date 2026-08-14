/**
 * Overlay renderer.
 *
 * A single paragraph of Malory can carry three independent layers at once:
 *
 *   em     — the edition's own italics (Caxton's colophons, the Latin epitaph)
 *   quote  — a validated quotation from the research base's ledger, highlighted
 *            exactly where it sits on the page
 *   gloss  — a Middle English word with an entry in the edition's glossary
 *
 * These layers do not nest tidily: a glossed word can fall inside a quotation,
 * and a quotation can start mid-italic. Rather than trying to build a proper
 * tree and failing on partial overlap, the text is cut at every boundary and
 * each resulting segment is wrapped in whichever layers are active over it.
 * Adjacent segments sharing a layer render seamlessly, and `data-edge` marks the
 * true first and last segment of a run so the CSS can round only the real ends.
 */

const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ESCAPE[c]);

// Outermost first. Quotes wrap glosses so a highlighted passage stays one block
// of colour; emphasis sits innermost because it is a property of the words.
const ORDER = ["quote", "em", "gloss"];

/**
 * @param {string} text
 * @param {Array<{start:number,end:number,type:string,id?:string,data?:object}>} ranges
 * @returns {string} HTML
 */
export function renderParagraph(text, ranges = []) {
  const valid = ranges
    .filter((r) => r && r.end > r.start && r.start >= 0 && r.start < text.length)
    .map((r) => ({ ...r, end: Math.min(r.end, text.length) }));

  if (!valid.length) return esc(text);

  const cuts = new Set([0, text.length]);
  for (const r of valid) {
    cuts.add(r.start);
    cuts.add(r.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  let html = "";
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (to <= from) continue;

    const active = valid
      .filter((r) => r.start <= from && r.end >= to)
      .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

    let seg = esc(text.slice(from, to));
    for (let k = active.length - 1; k >= 0; k--) {
      const r = active[k];
      const edge =
        r.start === from && r.end === to ? "both" : r.start === from ? "start" : r.end === to ? "end" : null;
      seg = wrap(r, seg, edge);
    }
    html += seg;
  }
  return html;
}

function attr(name, value) {
  return value === undefined || value === null ? "" : ` ${name}="${esc(String(value))}"`;
}

function wrap(range, inner, edge) {
  const edgeAttr = attr("data-edge", edge);
  switch (range.type) {
    case "em":
      return `<em>${inner}</em>`;
    case "quote":
      return (
        `<mark class="q"${attr("data-quote", range.id)}${edgeAttr}>` + inner + `</mark>`
      );
    case "gloss":
      return (
        `<span class="gl"${attr("data-term", range.id)}${attr("data-gloss", range.data?.gloss)}` +
        `${attr("tabindex", "0")}${attr("role", "button")}` +
        `${attr("aria-label", `${range.data?.term ?? range.id}: ${range.data?.gloss ?? ""}`)}` +
        `${edgeAttr}>${inner}</span>`
      );
    default:
      return inner;
  }
}

/**
 * Assemble the overlay ranges for one unit's paragraphs.
 *
 * @param {object} unit          a reading unit from derived/<work>/units.json
 * @param {Array}  unitQuotes    entries from data/indexes/quotes-by-unit.json
 * @param {Array}  unitGlosses   entries from data/indexes/glossary-hits.json
 * @param {Map}    glossMap      term -> glossary entry
 * @param {object} opts          { quotes:boolean, glosses:boolean }
 */
export function paragraphRanges(unit, unitQuotes = [], unitGlosses = [], glossMap = new Map(), opts = {}) {
  const { quotes: showQuotes = true, glosses: showGlosses = true } = opts;
  const byParagraph = unit.paragraphs.map(() => []);

  const em = unit.em ?? {};
  for (const [pi, list] of Object.entries(em)) {
    for (const [start, end] of list) {
      byParagraph[Number(pi)]?.push({ start, end, type: "em" });
    }
  }

  if (showQuotes) {
    for (const q of unitQuotes) {
      byParagraph[q.paragraph]?.push({ start: q.from, end: q.to, type: "quote", id: q.id });
    }
  }

  if (showGlosses) {
    for (const g of unitGlosses) {
      const entry = glossMap.get(g.term);
      if (!entry) continue;
      byParagraph[g.p]?.push({
        start: g.from,
        end: g.to,
        type: "gloss",
        id: g.term,
        data: { gloss: entry.gloss, term: entry.term },
      });
    }
  }

  return byParagraph;
}
