// Build-time sitemap over every static route Astro emitted.
// Astro's own sitemap integration is avoided so the base-path handling stays in one place.

const SITE = "https://jd-jones-ases.github.io";

export async function GET() {
  const pages = import.meta.glob("./**/*.astro", { eager: true });
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const urls = Object.keys(pages)
    .map((p) =>
      p
        .replace(/^\.\//, "/")
        .replace(/\/index\.astro$/, "/")
        .replace(/\.astro$/, "/")
    )
    // Dynamic routes and error pages are not enumerable here; they are covered by
    // their own index pages.
    .filter((p) => !p.includes("[") && !p.startsWith("/404"))
    .sort();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${base}${u}</loc></url>`).join("\n")}
</urlset>
`;

  return new Response(body, { headers: { "content-type": "application/xml" } });
}
