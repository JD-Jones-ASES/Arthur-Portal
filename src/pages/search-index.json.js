/**
 * Build-time search index.
 *
 * Two payloads, because the corpus is large and most searches are not full-text:
 *
 *   /search-index.json     chapters (title only), quotations, and every apparatus
 *                          record. Small; fetched when the palette opens.
 *   /search-fulltext.json  the prose of every reading unit. An order of magnitude
 *                          larger, so it is fetched only when the reader ticks
 *                          "search inside the texts".
 *
 * Generated from the same data the pages consume, so it cannot drift.
 */

import {
  readableWorks, spine, units as getUnits, quotes, episodes, characters,
  voices, cuts, glossary, tagLabel,
} from "../lib/portal-data.js";

const clip = (s, n = 180) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

export function GET() {
  const entities = [];

  /* --- reading units --- */
  for (const w of readableWorks()) {
    const sp = spine(w.id);
    const us = getUnits(w.id);
    for (const id of sp.order) {
      const u = us[id];
      entities.push({
        id,
        type: "chapter",
        title: u.title,
        sub: `${w.short}${u.label ? ` · ${u.label}` : ""}`,
        path: `read/${w.id}/${id}/`,
        branch: w.branch,
        terms: `${u.title} ${u.label ?? ""} ${w.short}`.toLowerCase(),
      });
    }
  }

  /* --- quotations --- */
  for (const q of quotes()) {
    entities.push({
      id: q.id,
      type: "quote",
      title: clip(q.text, 110),
      sub: `${q.voice}${q.anchor_label && q.anchor_label !== "?" ? ` · ${q.anchor_label}` : ""}`,
      path: q.spine ? `read/${q.work}/${q.spine.unit}/#p${q.spine.paragraph}` : `quotes/#${q.id}`,
      branch: q.branch,
      terms: `${q.text} ${q.voice} ${q.tags.map(tagLabel).join(" ")}`.toLowerCase(),
    });
  }

  /* --- apparatus --- */
  for (const e of episodes()) {
    entities.push({
      id: e.id,
      type: "story",
      title: e.title,
      sub: e.summary ? clip(e.summary, 90) : "",
      path: `stories/${e.id}/`,
      branch: e.branch ?? null,
      terms: `${e.title} ${e.summary ?? ""} ${(e.also_known_as ?? []).join(" ")}`.toLowerCase(),
    });
  }
  for (const c of characters()) {
    entities.push({
      id: c.id,
      type: "person",
      title: c.name,
      sub: c.one_line ? clip(c.one_line, 90) : "",
      path: `knights/${c.id}/`,
      branch: c.branch ?? null,
      terms: `${c.name} ${(c.aka ?? []).map((a) => a.form).join(" ")} ${c.one_line ?? ""}`.toLowerCase(),
    });
  }
  for (const v of voices()) {
    entities.push({
      id: v.id,
      type: "voice",
      title: v.name,
      sub: v.one_line ? clip(v.one_line, 90) : "",
      path: `library/${v.id}/`,
      branch: v.branch,
      terms: `${v.name} ${v.one_line ?? ""}`.toLowerCase(),
    });
  }
  for (const c of cuts()) {
    entities.push({
      id: c.id,
      type: "throughline",
      title: c.title,
      sub: c.gloss ? clip(c.gloss, 90) : "",
      path: `throughlines/${c.id}/`,
      branch: null,
      terms: `${c.title} ${c.gloss ?? ""}`.toLowerCase(),
    });
  }
  for (const g of glossary().entries ?? []) {
    entities.push({
      id: `gloss-${g.match}`,
      type: "word",
      title: g.term,
      sub: g.gloss,
      path: `glossary/#${encodeURIComponent(g.match)}`,
      branch: "english",
      terms: `${g.term} ${g.gloss}`.toLowerCase(),
    });
  }

  return new Response(JSON.stringify({ entities }), {
    headers: { "content-type": "application/json" },
  });
}
