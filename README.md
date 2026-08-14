# The Arthur Portal

*There is no “the legend.” Five centuries, many hands, one inheritance re-cut.*

A static, source-cited reading room for the **Matter of Britain** — built so a newcomer can learn the
famous stories, follow a throughline, follow the Grail, and follow a knight, without ever losing
track of *whose* Arthur they are reading.

## What makes it different

Most Arthurian resources smooth twelve contradictory authors into one tidy story. This one refuses.
Geoffrey’s conqueror-king is not Malory’s elected boy. Wolfram’s Grail — a stone that heals by
compassion — is not the Vulgate’s holy vessel that judges by purity. **The disagreements are not
corruptions of a lost original; they are the material.**

- **The stories, then the seams.** Every famous episode is retold plainly, then broken open to show
  which voices tell it and exactly where they part company.
- **Throughlines.** Seven cuts through the canon — the source of rule, the fellowship, the Grail,
  the betrayal, the wound, the return, and the foreknowledge that saves no one.
- **Follow the Grail.** How it was invented, the five incompatible things it became, and a guided
  chapter-by-chapter read of the quest itself.
- **Follow a knight.** Dossiers for the whole company, with the names each tradition gives them —
  Gwalchmai / Gawain, Peredur / Perceval / Parzival — and an itinerary through their entire arc in
  the primary text.
- **Read the sources.** Public-domain texts properly set, with the validated quotations highlighted
  where they actually sit on the page and Malory’s own Middle English glossary on hover.
- **Verification is the product.** Every quotation is located in its source by an automated gate
  before it can ship. Where the material is missing — and it often is — the gap is printed rather
  than papered over.

## Status

**In development.** See `DECISIONS.md` for the decision log and `AGENTS.md` for the working map.

## Run locally

```bash
npm install            # Node >= 22.12
npm run prepare:data   # ingest + validation gate
npm run build          # -> dist/
npm run dev:preview    # local dev server served from /
```

## Repo layout

See [AGENTS.md](AGENTS.md#repo-map).

## Licence

- **Code** (site, scripts, build tooling): [MIT](LICENSE)
- **Original apparatus** (retellings, dossiers, throughline essays, metadata):
  [CC-BY-SA-4.0](LICENSE-content.md)
- **Primary texts**: public domain (Project Gutenberg and archive.org; every edition, translator and
  date is listed at `/method/sources/`)

One translation used in research — Norris Lacy’s *Lancelot-Grail* — is **in copyright**, is not
redistributed here, and appears only as short cited quotations. See `DECISIONS.md` ADR-0004.
