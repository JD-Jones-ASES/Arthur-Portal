import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";

// Deployed to GitHub Pages as a project site:
//   https://jd-jones-ases.github.io/Arthur-Portal/
// `base` is applied to all built asset URLs; in-app links go through withBase()
// (src/lib/site.js) so the same code works locally at "/" and under the Pages subpath.
// Set LOCAL_ROOT=1 to serve from "/" for local previews.
const base = process.env.LOCAL_ROOT ? "/" : (process.env.PAGES_BASE ?? "/Arthur-Portal");

export default defineConfig({
  site: "https://jd-jones-ases.github.io",
  base,
  output: "static",
  trailingSlash: "always",
  integrations: [svelte()],
  build: { format: "directory" },
});
