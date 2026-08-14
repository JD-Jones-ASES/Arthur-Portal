# The Arthur Portal

*There is no “the” legend. Five centuries, many hands, one inheritance re-cut.*

A static, source-cited reading room for the **Matter of Britain** — built so a newcomer can learn
the famous stories, follow a throughline, follow the Grail, and follow a knight, without ever
losing track of *whose* Arthur they are reading.

## What makes it different

Most Arthurian resources smooth twelve contradictory authors into one tidy story. This one refuses.
Geoffrey’s conqueror-king is not Malory’s elected boy. Wolfram’s Grail — a stone that heals by
compassion — is not the Vulgate’s holy vessel that judges by purity. **The disagreements are not
corruptions of a lost original; they are the material.**

- **The stories, then the seams.** 49 famous episodes, each retold plainly and then broken open to
  show which voices tell it and exactly where they part company.
- **Throughlines.** Seven motifs tracked across the whole canon — the source of rule, the
  fellowship, the Grail, the betrayal, the wound, the return, and the foreknowledge that saves
  no one.
- **Follow the Grail.** How it was invented, the six incompatible things it became, and a guided
  chapter-by-chapter read of the quest itself.
- **Follow a knight.** 43 dossiers with the names each tradition gives them — Gwalchmai / Gawain,
  Peredur / Perceval / Parzival — and, for those with a real arc, an itinerary through their whole
  story in the primary text.
- **Read the sources.** 1,201 chapters across ten public-domain works, properly set, with the
  validated quotations highlighted where they actually sit and Malory’s own Middle English glossary
  on hover.
- **Verification is the product.** Every quotation is located in its source by an automated gate
  before it can ship. Where the material is missing — and it often is — the gap is printed rather
  than papered over.

## Status

**Feature-complete.** The gate is green end to end.

| | |
|---|---|
| Pages | 1,357 |
| Primary text | 1,201 reading units across 10 works, ~1.16 million words |
| Stories | 49 episodes |
| Figures | 43 dossiers |
| Voices | 12 authors and traditions |
| Throughlines | 7 |
| Quotations | 25, all located in source (23 exact, 2 fuzzy) |
| Glossary | 635 Middle English entries |
| Internal links | 53,416, all resolving |

## Run locally

```bash
npm install            # Node >= 22.12
npm run prepare:data   # ingest + the validation gate
npm run build          # -> dist/
npm run verify         # build + link check + accessibility check
npm run dev:preview    # local dev server served from /
```

`raw/` is gitignored; `npm run fetch:sources` rebuilds it from the checksummed manifest.

## Repo layout

See [AGENTS.md](AGENTS.md#repo-map).

## Deploying

Push to `main` → GitHub Actions builds and publishes to GitHub Pages at
`https://jd-jones-ases.github.io/Arthur-Portal/`.

**One-time setup.** Pages has to be switched on for the repository once, by hand:

> **Settings → Pages → Build and deployment → Source: `GitHub Actions`**

The workflow cannot do this for itself. Creating a Pages site requires *admin* scope, and a
workflow's `GITHUB_TOKEN` tops out at write — `actions/configure-pages` with `enablement: true`
returns `Resource not accessible by integration`. After that single change, every push to `main`
builds, link-checks, accessibility-checks and publishes automatically.

## Licence

- **Code** (site, scripts, build tooling): [MIT](LICENSE)
- **Original apparatus** (retellings, dossiers, throughline essays, metadata):
  [CC-BY-SA-4.0](LICENSE-content.md)
- **Primary texts**: public domain — every edition, translator and date is listed at
  `/method/sources/`

One translation used in research — Norris Lacy’s *Lancelot-Grail* — is **in copyright**, is not
redistributed here, and appears only as two short cited quotations. See `DECISIONS.md` ADR-0004.
