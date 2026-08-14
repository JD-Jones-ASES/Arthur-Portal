#!/usr/bin/env node
/**
 * Fetch the public-domain source texts into raw/ and record a checksum manifest.
 *
 *   node scripts/ingest/fetch-sources.mjs [--force] [--only malory,gawain]
 *
 * raw/ is gitignored: this script is how a fresh clone rebuilds it. The manifest
 * (raw/manifest.json) IS committed, so a re-fetch that silently returns different
 * bytes is detectable — Gutenberg does re-issue texts.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

const ROOT = process.cwd();
const RAW = resolve(ROOT, "raw");
const MANIFEST = resolve(ROOT, "data/works/raw-manifest.json");

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(",")) : null;

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

async function main() {
  const config = JSON.parse(await readFile(resolve(ROOT, "data/works/works.config.json"), "utf8"));
  await mkdir(RAW, { recursive: true });

  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, "utf8")) : { files: {} };
  const drift = [];
  let fetched = 0;
  let skipped = 0;

  for (const work of config.works) {
    if (ONLY && !ONLY.has(work.id)) continue;
    for (const src of work.sources ?? []) {
      if (!src.gutenberg) continue;
      const dest = join(RAW, src.file);

      if (existsSync(dest) && !FORCE) {
        skipped++;
        continue;
      }

      const url = `https://www.gutenberg.org/cache/epub/${src.gutenberg}/pg${src.gutenberg}.txt`;
      process.stdout.write(`  fetching ${work.id}/${src.id} … `);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buf);
      fetched++;

      const digest = sha(buf);
      const prior = manifest.files[src.file];
      if (prior && prior.sha256 !== digest) {
        drift.push(`${src.file}: checksum changed (${prior.sha256.slice(0, 12)} → ${digest.slice(0, 12)})`);
      }
      manifest.files[src.file] = {
        work: work.id,
        source: src.id,
        gutenberg: src.gutenberg,
        url,
        bytes: buf.length,
        sha256: digest,
        fetched_at: new Date().toISOString().slice(0, 10),
      };
      console.log(`${(buf.length / 1024).toFixed(0)} KB`);
    }
  }

  manifest.note =
    "Checksums of the public-domain source texts in raw/ (gitignored). Committed so a re-fetch " +
    "that returns different bytes is detectable — Project Gutenberg does re-issue texts.";
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\nfetched ${fetched}, skipped ${skipped} (already present; --force to refetch)`);
  if (drift.length) {
    console.warn("\n⚠ source drift detected — re-run prepare:data and check the spine:");
    for (const d of drift) console.warn("   " + d);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
