/**
 * A deliberately tiny Markdown renderer for the apparatus prose.
 *
 * The hand-authored fields (essays, dossiers, retellings) use exactly four
 * things: paragraphs, **bold**, *italic* and the occasional [link](url). Pulling
 * in a full CommonMark implementation to support four constructs would add a
 * dependency, a bundle, and a class of injection bugs, so this escapes first and
 * then applies four rules. Anything it does not recognise renders as plain text,
 * which is the correct failure mode for a site whose whole claim is accuracy.
 */

const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ESCAPE[c]);

function inline(text) {
  let s = esc(text);
  // [label](href) — internal paths only; no protocol-relative or javascript: URLs.
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) =>
    /^(\/|#|https:\/\/|mailto:)/.test(href) ? `<a href="${href}">${label}</a>` : m
  );
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(—[])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/ — /g, " &mdash; ");
  return s;
}

/** Block-level: paragraphs and simple unordered lists, separated by blank lines. */
export function mdToHtml(md = "") {
  const blocks = String(md).split(/\n{2,}/);
  const out = [];

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (/^[-*]\s+/.test(block)) {
      const items = block
        .split(/\n(?=[-*]\s)/)
        .map((li) => `<li>${inline(li.replace(/^[-*]\s+/, "").trim())}</li>`)
        .join("");
      out.push(`<ul>${items}</ul>`);
      continue;
    }

    if (/^>\s?/.test(block)) {
      out.push(`<blockquote><p>${inline(block.replace(/^>\s?/gm, "").trim())}</p></blockquote>`);
      continue;
    }

    const h = /^(#{2,4})\s+(.*)$/.exec(block);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    out.push(`<p>${inline(block.replace(/\n/g, " "))}</p>`);
  }

  return out.join("\n");
}

/** First sentence or so, for a meta description. */
export function excerpt(md = "", n = 160) {
  const plain = String(md)
    .replace(/[*_>#]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > n ? plain.slice(0, n - 1) + "…" : plain;
}
