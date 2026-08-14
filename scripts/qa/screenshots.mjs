#!/usr/bin/env node
/**
 * Visual QA — drives the system Chrome over a list of routes and writes PNGs.
 *
 *   node scripts/qa/screenshots.mjs [--routes a,b,c] [--out DIR] [--port N]
 *                                  [--themes paper,night] [--viewports desktop,mobile]
 *
 * Builds nothing; expects `npm run build` to have run. Serves dist/ statically so the
 * production base path (/Arthur-Portal) is exercised exactly as deployed.
 */

import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const DIST = resolve(ROOT, "dist");
const BASE = process.env.PAGES_BASE ?? "/Arthur-Portal";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}

const OUT = resolve(ROOT, args.get("out") ?? "qa-shots");
const PORT = Number(args.get("port") ?? 4399);
const THEMES = (args.get("themes") ?? "paper,night").split(",").filter(Boolean);
const VIEWPORTS = (args.get("viewports") ?? "desktop,mobile").split(",").filter(Boolean);

const DEFAULT_ROUTES = ["/", "/start/", "/stories/", "/throughlines/", "/grail/", "/knights/", "/read/", "/library/", "/quotes/", "/method/"];
const ROUTES = (args.get("routes") ?? DEFAULT_ROUTES.join(",")).split(",").filter(Boolean);

const SIZES = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 },
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".xml": "application/xml",
};

function serve() {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (BASE !== "/" && p.startsWith(BASE)) p = p.slice(BASE.length) || "/";
        let file = join(DIST, p);
        if (p.endsWith("/")) file = join(file, "index.html");
        else if (!extname(file)) file = join(file, "index.html");
        const body = await readFile(file);
        res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      }
    });
    server.listen(PORT, () => ok(server));
  });
}

const slug = (r) => (r === "/" ? "home" : r.replace(/^\/|\/$/g, "").replace(/\//g, "-"));

async function main() {
  if (!existsSync(DIST)) {
    console.error("dist/ not found — run `npm run build` first.");
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });
  const server = await serve();

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });

  const failures = [];
  let shots = 0;

  for (const vp of VIEWPORTS) {
    const size = SIZES[vp];
    if (!size) continue;
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
      // Seed the theme preference before any page script runs.
      await ctx.addInitScript((t) => {
        try {
          localStorage.setItem("arthur-theme", t);
        } catch (e) {}
      }, theme);
      const page = await ctx.newPage();

      const consoleErrors = [];
      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => consoleErrors.push(String(e)));

      for (const route of ROUTES) {
        const url = `http://localhost:${PORT}${BASE}${route}`.replace(/([^:])\/\//g, "$1/");
        const before = consoleErrors.length;
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        if (!resp || resp.status() >= 400) {
          failures.push(`${route} → HTTP ${resp ? resp.status() : "no response"}`);
          continue;
        }
        await page.evaluate(() => document.fonts.ready);
        const file = join(OUT, `${slug(route)}--${vp}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: vp === "desktop" });
        shots++;
        const errs = consoleErrors.slice(before);
        if (errs.length) failures.push(`${route} [${vp}/${theme}] console: ${errs.join(" | ")}`);
      }
      await ctx.close();
    }
  }

  await browser.close();
  server.close();

  console.log(`\n${shots} screenshot(s) → ${OUT}`);
  if (failures.length) {
    console.error(`\n${failures.length} problem(s):`);
    for (const f of failures) console.error("  ✗ " + f);
    process.exit(1);
  }
  console.log("No console errors, no bad responses.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
