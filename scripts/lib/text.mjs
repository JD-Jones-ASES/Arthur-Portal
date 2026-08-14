/**
 * Shared text utilities for the ingest and validation pipeline.
 *
 * The normaliser here is a port of the research base's own quote gate
 * (`docs/bases/_engine/tools/validate.py`, not present in this repo). It has to
 * survive four different kinds of noise at once:
 *
 *   - Project Gutenberg italics markers (`_Hic jacet…_`)
 *   - editorial footnote markers glued to words (`Badon.(11)`)
 *   - Middle English letterforms (thorn þ, yogh ȝ)
 *   - OCR whitespace and punctuation drift in the scanned sources
 *
 * so it strips everything that is not a letter or a digit and compares what is
 * left. Verified against the base's 25 seed quotes: 23 match exactly, and the two
 * that don't (Geoffrey's OCR, the Middle English Gawain) clear the per-source
 * fuzzy thresholds already recorded in arthur/base.json.
 */

/** Aggressively normalise text for locating a quote inside a source. */
export function normalise(s) {
  return (
    s
      .normalize("NFKD")
      // editorial footnote markers: "Badon.(11) In this engagement…"
      .replace(/\((\d{1,3})\)/g, "")
      // Middle English letterforms
      .replace(/[þÞ]/g, "th")
      .replace(/[ðÐ]/g, "th")
      .replace(/[ȝʒƷ]/g, "3")
      .replace(/[æÆ]/g, "ae")
      .replace(/[œŒ]/g, "oe")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
  );
}

/**
 * Build a map from normalised-character index back to raw-character index, so a
 * match found in normalised space can be highlighted in the original text.
 */
export function normaliseWithMap(s) {
  const nfkd = s.normalize("NFKD");
  let out = "";
  const map = [];
  for (let i = 0; i < nfkd.length; i++) {
    const ch = nfkd[i];
    // Skip footnote markers wholesale: "(12)"
    if (ch === "(") {
      const m = /^\(\d{1,3}\)/.exec(nfkd.slice(i));
      if (m) {
        i += m[0].length - 1;
        continue;
      }
    }
    let rep;
    if (ch === "þ" || ch === "Þ" || ch === "ð" || ch === "Ð") rep = "th";
    else if (ch === "ȝ" || ch === "ʒ" || ch === "Ʒ") rep = "3";
    else if (ch === "æ" || ch === "Æ") rep = "ae";
    else if (ch === "œ" || ch === "Œ") rep = "oe";
    else {
      const low = ch.toLowerCase();
      rep = /[a-z0-9]/.test(low) ? low : "";
    }
    for (let k = 0; k < rep.length; k++) {
      out += rep[k];
      map.push(i);
    }
  }
  return { normalised: out, map, nfkd };
}

/** Similarity of two equal-ish strings, 0..1 — a cheap Levenshtein ratio. */
export function ratio(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const dist = levenshtein(a, b, Math.ceil(Math.max(a.length, b.length) * 0.35) + 1);
  if (dist === null) return 0;
  return 1 - dist / Math.max(a.length, b.length);
}

/** Levenshtein with an early-exit band; returns null if distance exceeds `max`. */
function levenshtein(a, b, max) {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > max) return null;
  let prev = new Int32Array(m + 1);
  let cur = new Int32Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    const lo = Math.max(1, i - max);
    const hi = Math.min(m, i + max);
    if (lo > 1) cur[lo - 1] = max + 1;
    let best = max + 1;
    for (let j = lo; j <= hi; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return null;
    const t = prev;
    prev = cur;
    cur = t;
  }
  return prev[m] <= max ? prev[m] : null;
}

/**
 * Locate `needle` inside `haystack`, both already normalised.
 * Returns { index, ratio } or null. Exact substring first; then a windowed
 * fuzzy scan for OCR-damaged sources.
 */
export function locate(haystackNorm, needleNorm, threshold = 0.9) {
  const exact = haystackNorm.indexOf(needleNorm);
  if (exact !== -1) return { index: exact, ratio: 1 };

  const L = needleNorm.length;
  if (L < 12 || L > haystackNorm.length) return null;

  // Coarse pass: anchor on a rare-ish slice from the middle of the needle, then
  // score full windows around each anchor hit. Much faster than scanning every
  // offset across a multi-megabyte source.
  const probeLen = Math.min(24, Math.max(12, Math.floor(L / 4)));
  const probes = [
    needleNorm.slice(0, probeLen),
    needleNorm.slice(Math.floor((L - probeLen) / 2), Math.floor((L - probeLen) / 2) + probeLen),
    needleNorm.slice(L - probeLen),
  ];

  const candidates = new Set();
  probes.forEach((probe, pi) => {
    const offset = pi === 0 ? 0 : pi === 1 ? Math.floor((L - probeLen) / 2) : L - probeLen;
    let from = 0;
    for (let guard = 0; guard < 400; guard++) {
      const hit = haystackNorm.indexOf(probe, from);
      if (hit === -1) break;
      candidates.add(Math.max(0, hit - offset));
      from = hit + 1;
    }
  });

  let best = null;
  for (const start of candidates) {
    const window = haystackNorm.slice(start, start + L);
    const r = ratio(needleNorm, window);
    if (r >= threshold && (!best || r > best.ratio)) best = { index: start, ratio: r };
  }
  if (best) return best;

  // Last resort: a strided full scan, for quotes whose every probe is damaged.
  const stride = Math.max(1, Math.floor(L / 3));
  for (let i = 0; i + L <= haystackNorm.length; i += stride) {
    for (let d = 0; d < stride; d += Math.max(1, Math.floor(stride / 4))) {
      const start = i + d;
      const r = ratio(needleNorm, haystackNorm.slice(start, start + L));
      if (r >= threshold && (!best || r > best.ratio)) best = { index: start, ratio: r };
    }
  }
  return best;
}

/** Collapse runs of whitespace, trim. */
export const squash = (s) => s.replace(/\s+/g, " ").trim();

/** Roman numeral → integer. */
export function fromRoman(r) {
  const vals = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
  const s = r.toLowerCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = vals[s[i]];
    const next = vals[s[i + 1]];
    total += next && v < next ? -v : v;
  }
  return total;
}

/** Integer → lowercase roman numeral. */
export function toRoman(n) {
  const table = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let out = "";
  for (const [v, s] of table) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/** Strip the Project Gutenberg header and licence footer. */
export function stripGutenberg(raw) {
  let t = raw.replace(/\r\n/g, "\n");
  const start = t.match(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  if (start) t = t.slice(start.index + start[0].length);
  const end = t.match(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i);
  if (end) t = t.slice(0, end.index);
  // Older Gutenberg files sign off in prose before the starred marker — "End of
  // Project Gutenberg's Arthurian Chronicles, by Wace and Layamon" — and that
  // sentence would otherwise land in the last chapter of the reading text.
  const prose = t.match(/\n\s*End of (?:the )?Project Gutenberg('s|,)?[^\n]*/i);
  if (prose) t = t.slice(0, prose.index);
  return t.trim();
}
