# AGENTS.md — what this is & how to work it

Entry point for anyone (human or coding agent) opening this repo cold. Start here.

## What this is

**The Arthur Portal** — a static, source-cited reading room for the **Matter of Britain**.
**Repo:** `JD-Jones-ASES/Arthur-Portal` · **Base path:** `/Arthur-Portal`

It publishes the public-domain Arthurian canon in full — Malory first, then Gawain, the Mabinogion,
Chrétien, Perlesvaus, Parzival, the chroniclers — wrapped in an apparatus that lets a newcomer learn
the famous stories, follow a throughline, follow the Grail, and follow a knight.

**The thesis, inherited from the research base in `arthur/`:** *there is no "the legend."* Twelve
authors across five centuries inherited the same organs — a sword, a table, a grail, a betrayal, a
wound, a prophecy — and each re-cut them to mean something different. **The divergences are the
material.** So this is not an encyclopedia that resolves contradictions; it is an instrument that
*displays* them.

It is **data-first** and **verification-first**: every quotation is located in its source text by an
automated gate before it can be published, and the build fails loud if one cannot be found.

## Tech stack

- **Astro 7**, `output: "static"`, `trailingSlash: "always"` — pages in `src/pages/`, components in
  `src/components/`.
- **Svelte 5** islands (`src/islands/`) for interactive views, hydrated `client:visible`.
- **Vanilla ES modules** (`src/lib/`) for non-island UI — no front-end framework there.
- **CSS custom properties** (`src/styles/portal.css`) — no CSS framework. Self-hosted `@fontsource`.
- **Node 22** build scripts (`scripts/`), **Ajv** JSON-Schema validation (`schemas/`).
- No database, no server, no client-side data fetching. Generated data is committed.

## Build & run

```bash
npm install            # Node >= 22.12
npm run prepare:data   # ingest + the validation gate (run locally after any content change)
npm run build          # astro build -> dist/
npm run verify         # build + link check + accessibility check
npm run dev            # local dev server (production base path /Arthur-Portal)
npm run dev:preview    # local dev server served from /  (convenient for previewing)
npm run qa:shots       # visual QA: drives system Chrome over key routes -> qa-shots/
npm run fetch:sources  # rebuild gitignored raw/ from the checksummed manifest
```

`prepare:data` regenerates the committed `derived/` spine and `data/` indexes, then runs the gate.
**CI does NOT run `prepare:data`** — it runs a pure `astro build` over the committed generated data.
So: edit content → `prepare:data` locally → commit the regenerated data → push.

## How it works (architecture)

```
arthur/ (research base)  ─┐
raw/    (PD source text) ─┴─▶ derived/ (reading spine) ─▶ data/ (apparatus) ─▶ gate ─▶ static pages
```

- **Content model:** `Work → Part (book) → Unit (chapter = one reading page) → Paragraph (#pN)`.
  Stable ids: `malory`, `malory-bk-13`, `malory-13-vii`, anchor `#p4`.
- **`arthur/` is the research base** and is treated as read-only input, with one exception:
  `arthur/index/quotes.json` is the quote ledger's source of truth and is *designed* to be extended.
  Everything else in `arthur/` is read, never written.
- **`raw/` is gitignored** and re-fetchable from a checksummed manifest
  (`npm run fetch:sources`). `raw/restricted/` holds in-copyright texts used for research and quote
  validation only — see ADR-0004 and §Rights below.

## The rights model (read this before adding a text)

Every work carries a `tier` in `data/works/works.config.json`:

- **Tier A** — clean public domain. Full paragraph-preserving reader.
- **Tier B** — public domain but rough OCR. Excerpt reader, sliced from the base's corpus by anchor
  and re-flowed; **labelled in the UI** as reflowed OCR.
- **Tier C** — in copyright or unquotable OCR. **Never a reader unit.** Short cited quotations only.
  The Lacy *Lancelot-Grail* translation is Tier C.

`validate-rights` fails the build if Tier-C text longer than 300 characters appears anywhere in
`data/` or `derived/`, or if a reader unit is generated for a Tier-C work.

## The gate (`npm run validate`)

| script | what it proves |
|---|---|
| `validate-basic` | every `data/` file matches its JSON Schema (ajv, 2020-12, `additionalProperties:false`) |
| `validate-quotes` | **every quote locates in its source text** — normalized-exact, else fuzzy ≥ the per-source threshold in `arthur/base.json`. Port of the base's own `validate.py`. |
| `validate-rights` | the tier policy above |
| `validate-refs` | every id reference resolves; no orphans |
| `validate-coverage` | editorial thresholds (every episode has a resolving passage and a non-empty cost; every gap is *declared*) |
| `scan-text` | OCR/encoding artefacts in derived spines |
| `check-links` | post-build crawl of `dist/` — every internal href and `#anchor` resolves |
| `qa:a11y` | markup accessibility: alt text, labelled SVG, discernible link text, one h1, no duplicate ids, real descriptions |

**The gate staying green is the definition of done.**

## Repo map

```
arthur/       THE RESEARCH BASE — read-only input (quotes.json is the one writable file)
raw/          fetched public-domain sources (gitignored, checksummed, re-fetchable)
raw/restricted/  in-copyright texts — research + validation only, NEVER committed, NEVER rendered
derived/      GENERATED reading spine (committed)
schemas/      JSON-Schema contracts (draft 2020-12, additionalProperties:false)
data/         apparatus — hand-authored (episodes, characters, voices, cuts, grail, follows…)
              + generated (indexes/, quotes.json, glossary/)
scripts/ingest/    pipeline stages       scripts/validate/   the build gate
scripts/qa/        screenshot harness
src/          Astro app: pages/, components/, islands/ (Svelte), lib/ (vanilla ES), styles/
.github/workflows/  deploy.yml (Pages) · ci.yml (gate on PR)
```

## Design system

*The Illuminated Codex.* Vellum ground, rubricated vermilion headings, gold accents, lapis links.
Fonts: EB Garamond (prose) / Cinzel (display) / IM Fell English SC (rubrics).

The load-bearing mechanism is **`data-branch`**: every voice belongs to a manuscript tradition
(`chronicle · welsh · french · german · english · reception`) and that tradition carries one hue
across the whole site — quote chips, voice pages, reader margins, the timeline, the divergence view.
It exists so House Constraint 1 (*name the version*) is not merely stated but **seen**.

Set `data-branch="french"` on any container and `--branch / --branch-ink / --branch-wash` follow.
**Night-mode contrast rule:** text on a coloured chip uses the `-ink` variant, never white.

Themes toggle on `<html data-theme>` (`paper` | `night`), applied before first paint.

## Editorial standards (non-negotiable — inherited from `arthur/ARTHUR.md`)

1. **Name the version.** No claim about "the legend" without a voice attached. Where two voices
   disagree, render the disagreement; collapsing them into a generic "Arthurian myth" is the
   cardinal sin.
2. **Count the cost.** Every episode and throughline carries a non-empty `cost` — what does this
   excellence *deplete*? The build fails without it. This is the canon's load-bearing thesis.
3. **Quote or declare.** A voice's take carries either a validated `quote_id` or an explicit
   `gap_note`. Silence is not permitted; *"described from the canon — no validated quote"* is.
4. **IP-safety.** Cite the pre-1500 canon and its public-domain translations. Archetypes may be
   evoked; **no modern adaptation is ever named or leaned on** — no films, series, games, or studio
   designs. All imagery is hand-authored SVG.
5. **Respect the translation-copyright line.** Tier C is quote-only, always with translator and locus.
6. **Flag the slides.** The mysticism/therapy slide ("what the myth eternally means for you") and the
   nationalist pseudo-history slide ("the real King Arthur") are named on `/method/` and avoided
   everywhere. Retellings narrate; they do not moralise.
7. **Grant each text its own metaphysics.** Report what a text claims about transcendence; never
   adjudicate, never import one text's metaphysics into another.

## Deploy

Push to `main` → GitHub Actions runs `astro build` → GitHub Pages. Base path `/Arthur-Portal`
(see `astro.config.mjs`). Generated data is committed so CI only needs to build.

> **Note:** GitHub Pages on a *private* repository requires a paid plan. The workflow is correct and
> ready; the repo may need to be made public for the deploy to publish.

## Extending it

- **A new text** → add to `data/works/works.config.json` (title, translator, year, branch, tier,
  layout), add a parser case in `scripts/ingest/build-spine.mjs`, run `prepare:data`.
- **A new episode / character / throughline** → drop a JSON record in the matching `data/` folder;
  the schema and the coverage gate will tell you what is missing.
- **A new quote** → add it to `arthur/index/quotes.json` (the base's source of truth), then
  `npm run validate:quotes`. If it doesn't locate in the corpus, it doesn't ship.

## What is here

1,346 pages. 1,201 reading units across ten works (~1.16 million words); 49 episodes; 43 character
dossiers; 12 voices; 7 throughlines; 25 validated quotations; 635 glossary entries; 48,832 internal
links, all resolving.

## Traps worth knowing about

- **Svelte 5:** never name a local variable `state`. The compiler then reads the `$state` rune as a
  store auto-subscription and the page dies at build time with `store.subscribe is not a function`.
- **Ajv:** draft 2020-12 lives at `ajv/dist/2020.js`; the default export is draft-07.
- **Screenshots are not evidence for fine detail.** A vision model reading a screenshot misreported
  two citations during testing that the data proved correct. Check small text against the data.
- **`raw/restricted/` must never be committed.** `validate-rights` enforces it, but know why.

See `DECISIONS.md` for the decision log (ADR-0001 … ADR-0008).
