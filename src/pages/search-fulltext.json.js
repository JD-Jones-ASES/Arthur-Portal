/**
 * The heavy half of the search index: the full prose of every reading unit.
 *
 * Kept in a separate request because it is roughly ten times the size of the
 * entity index, and most searches never need it. Fetched on demand when the
 * reader ticks "search inside the texts".
 */

import { readableWorks, spine, units as getUnits } from "../lib/portal-data.js";

export function GET() {
  const fulltext = [];
  for (const w of readableWorks()) {
    const sp = spine(w.id);
    const us = getUnits(w.id);
    for (const id of sp.order) {
      fulltext.push({ id, text: us[id].paragraphs.join(" ").toLowerCase() });
    }
  }
  return new Response(JSON.stringify({ fulltext }), {
    headers: { "content-type": "application/json" },
  });
}
