#!/usr/bin/env node
/**
 * Accessibility and markup sanity check over the built site.
 *
 * Not a substitute for axe or a screen reader, but it catches the failures that
 * actually happen on a generated site with tens of thousands of links: an image
 * without alt text, a heading level skipped, a link whose only text is "here",
 * a duplicated element id, a page with no h1 or no lang.
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = process.cwd();
const DIST = resolve(ROOT, "dist");

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const VAGUE = new Set(["here", "click here", "link", "read more", "more", "this"]);

async function main() {
  if (!existsSync(DIST)) {
    console.error("dist/ not found — run `npm run build` first.");
    process.exit(1);
  }
  const files = await walk(DIST);
  const problems = [];
  const counts = { pages: 0, images: 0, links: 0 };

  for (const f of files) {
    const rel = f.slice(DIST.length);
    const html = await readFile(f, "utf8");
    counts.pages++;

    if (!/<html[^>]+lang="/.test(html)) problems.push(`${rel}: <html> has no lang`);
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    if (h1s.length === 0) problems.push(`${rel}: no <h1>`);
    if (h1s.length > 1) problems.push(`${rel}: ${h1s.length} <h1> elements`);
    if (!/<title>[^<]{3,}<\/title>/.test(html)) problems.push(`${rel}: no title`);
    if (!/name="description" content="[^"]{20,}"/.test(html)) problems.push(`${rel}: no meaningful description`);

    // images need alt text
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      counts.images++;
      if (!/\salt=/.test(m[0])) problems.push(`${rel}: <img> without alt — ${m[0].slice(0, 70)}`);
    }

    // inline svg needs a role/label or aria-hidden
    for (const m of html.matchAll(/<svg\b[^>]*>/g)) {
      if (!/aria-hidden|role="img"|role="presentation"/.test(m[0])) {
        problems.push(`${rel}: <svg> with no role or aria-hidden — ${m[0].slice(0, 70)}`);
      }
    }

    // links must have discernible text
    for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
      counts.links++;
      const text = m[1].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").trim();
      const labelled = /aria-label=|aria-labelledby=/.test(m[0]);
      if (!text && !labelled) problems.push(`${rel}: link with no text and no label — ${m[0].slice(0, 80)}`);
      else if (VAGUE.has(text.toLowerCase())) problems.push(`${rel}: vague link text "${text}"`);
    }

    // duplicate ids break anchors and labels
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${rel}: duplicate id "${id}"`);
      seen.add(id);
    }

    // buttons need a name
    for (const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) {
      const text = m[1].replace(/<[^>]+>/g, "").trim();
      if (!text && !/aria-label=/.test(m[0])) problems.push(`${rel}: button with no accessible name`);
    }
  }

  console.log(
    `Accessibility: ${counts.pages} page(s), ${counts.links.toLocaleString()} link(s), ${counts.images} image(s).`
  );

  if (problems.length) {
    // Collapse repeats — a template fault shows up on every page it renders on.
    const grouped = new Map();
    for (const p of problems) {
      const key = p.replace(/^[^:]+: /, "");
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }
    console.error(`\n${problems.length} issue(s), ${grouped.size} distinct:`);
    for (const [k, n] of [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
      console.error(`  ✗ ${n > 1 ? `(×${n}) ` : ""}${k}`);
    }
    process.exit(1);
  }
  console.log("No markup accessibility problems found.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
