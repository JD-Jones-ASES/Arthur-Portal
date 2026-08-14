#!/usr/bin/env node
/**
 * Post-build link check: crawl dist/ and prove every internal href and #anchor resolves.
 *
 * Catches the failure mode this site is most exposed to — thousands of generated cross-links
 * between episodes, characters, quotes and reader chapters, any one of which can rot silently.
 *
 * External links (http/https/mailto) are listed but not fetched.
 */

import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, posix } from "node:path";

const ROOT = process.cwd();
const DIST = resolve(ROOT, "dist");
const BASE = (process.env.PAGES_BASE ?? "/Arthur-Portal").replace(/\/$/, "");

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** Map a site-absolute URL path to the file dist/ would serve for it. */
function targetFor(urlPath) {
  let p = urlPath;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  if (!p.startsWith("/")) p = "/" + p;
  const asFile = join(DIST, p);
  if (p.endsWith("/")) return join(asFile, "index.html");
  if (/\.[a-z0-9]+$/i.test(p)) return asFile;
  return join(asFile, "index.html");
}

async function main() {
  if (!existsSync(DIST)) {
    console.error("dist/ not found — run `npm run build` first.");
    process.exit(1);
  }

  const files = await walk(DIST);
  const ids = new Map(); // html file -> Set of anchor ids
  const docs = new Map();

  for (const f of files) {
    const html = await readFile(f, "utf8");
    docs.set(f, html);
    const set = new Set();
    for (const m of html.matchAll(/\sid="([^"]+)"/g)) set.add(m[1]);
    for (const m of html.matchAll(/\sname="([^"]+)"/g)) set.add(m[1]);
    ids.set(f, set);
  }

  const problems = [];
  let internal = 0;
  let external = 0;

  for (const [file, html] of docs) {
    const rel = file.slice(DIST.length) || "/";
    const hrefs = [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]);

    for (const href of hrefs) {
      if (!href || href.startsWith("#")) {
        // same-page anchor
        if (href.length > 1) {
          const id = decodeURIComponent(href.slice(1));
          if (!ids.get(file).has(id)) problems.push(`${rel} → same-page anchor #${id} not found`);
        }
        continue;
      }
      if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(href)) {
        external++;
        continue;
      }

      internal++;
      const [rawPath, hash] = href.split("#");
      let urlPath = rawPath;

      if (!urlPath) urlPath = rel.replace(/index\.html$/, "");
      else if (!urlPath.startsWith("/")) {
        // relative — resolve against the current document's directory
        const dir = posix.dirname(rel.replace(/\\/g, "/"));
        urlPath = posix.normalize(posix.join(dir, urlPath));
      }

      const target = targetFor(urlPath);
      if (!existsSync(target)) {
        problems.push(`${rel} → ${href}  (expected ${target.slice(DIST.length)})`);
        continue;
      }
      if (hash) {
        const targetHtml = docs.get(target) ?? (await readFile(target, "utf8"));
        if (!ids.has(target)) {
          const set = new Set();
          for (const m of targetHtml.matchAll(/\sid="([^"]+)"/g)) set.add(m[1]);
          ids.set(target, set);
        }
        const id = decodeURIComponent(hash);
        if (!ids.get(target).has(id)) problems.push(`${rel} → ${href}  (anchor #${id} not in target)`);
      }
    }
  }

  console.log(
    `Checked ${files.length} page(s): ${internal} internal link(s), ${external} external (not fetched).`
  );

  if (problems.length) {
    console.error(`\n${problems.length} broken link(s):`);
    for (const p of problems.slice(0, 80)) console.error("  ✗ " + p);
    if (problems.length > 80) console.error(`  … and ${problems.length - 80} more`);
    process.exit(1);
  }
  console.log("All internal links resolve.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
