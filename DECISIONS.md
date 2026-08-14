# DECISIONS — the architecture decision log

Newest last. Each entry: context, decision, consequences.

---

## ADR-0001 — Astro 7 static + Svelte 5 islands, at the repo root

**Context.** The repo contained only `arthur/`, a research base from another project. A portal had
to be built around it. Four sibling portals in the same account (`spengler-portal`, `commonplace`,
`moby-dick-portal`, `shakespeare-portal`) already establish a house pattern.

**Decision.** Follow the house pattern exactly: Astro 7 `output: "static"` with
`trailingSlash: "always"` at the repo root, Svelte 5 islands for interactive views, vanilla ES
modules for everything else, CSS custom properties with no framework, self-hosted `@fontsource`
fonts, Ajv + JSON Schema for data contracts, and the
`raw → derived → data → gate → pages` pipeline with `prepare:data` run locally and CI doing a pure
`astro build` over committed generated data.

**Consequences.** Zero-novelty infrastructure; effort goes into content and verification instead.
An agent who knows any sibling repo can work this one immediately. Base path is `/Arthur-Portal`
with a `withBase()` helper, and `LOCAL_ROOT=1` for root-served local previews.

---

## ADR-0002 — `data-branch`: the manuscript tradition is the design dimension

**Context.** The base's first house constraint is *name the version, never flatten it*. The single
most common failure mode for Arthurian material is presenting a smoothed-out composite as "the
legend." A portal can restate that rule in prose and still commit the sin on every page.

**Decision.** Make the tradition a **visual primitive**. Six branches — `chronicle`, `welsh`,
`french`, `german`, `english`, `reception` — each with a hue triplet (`--branch`, `--branch-ink`,
`--branch-wash`). Setting `data-branch` on any container re-keys everything inside it. The hue
carries across quote chips, voice pages, reader margins, the timeline, and the divergence view.

This is the direct analogue of the Spengler portal's `data-cult` mechanism, chosen for the same
reason: one taxonomy, one colour, carried everywhere.

**Consequences.** You cannot read a claim on this site without seeing whose tradition it comes from.
Night mode must use the `-ink` variant for text on coloured chips (never white) to hold contrast.
Adding a branch means adding one hue triplet and one selector.

---

## ADR-0003 — Three-tier text policy

**Context.** The corpus mixes clean Project Gutenberg etexts, rough OCR of nineteenth-century scans
and Middle English blackletter, and one in-copyright modern translation. Publishing them all
identically would be both misleading and, in one case, unlawful.

**Decision.** Every work carries a `tier`:

- **Tier A** — clean public domain → full paragraph-preserving reader.
- **Tier B** — public domain, rough OCR → excerpt reader sliced from the base's corpus by anchor and
  re-flowed on sentence boundaries, **labelled in the UI** as reflowed OCR with original pagination
  lost.
- **Tier C** — in copyright, or OCR too rough to quote at length → **never a reader unit**; short
  cited quotations only.

Enforced by `scripts/validate/validate-rights.mjs`, not by good intentions.

**Consequences.** The reader never silently presents a bad text as a good one. Tier B pages carry an
honest provenance note. Promoting a work from B to A means sourcing a better edition, not editing
the label.

---

## ADR-0004 — The Lacy *Lancelot-Grail* is Tier C, and leaves the tracked tree

**Context.** `arthur/index/_corpus/vulgate1.txt` and `vulgate2.txt` are ~4.8 MB of Norris Lacy's
*Lancelot-Grail* translation, **which is in copyright**. The research base's own rules
(`arthur/ARTHUR.md`, constraint 4) say it lives in a gitignored `raw/` and is "never redistributed" —
but in this repo it had been committed. Every sibling portal is public.

**Decision.** Confirmed with the repo owner: the translation was used in research and is to be
ignored going forward.

1. Both files move to `raw/restricted/` (gitignored) and are `git rm --cached`-ed.
2. `validate-quotes` gains a restricted-source path: when `raw/restricted/` is present locally it
   validates the two Vulgate quotes in full and refreshes a committed attestation record
   (`data/attestations.json`: `{quote_id, source, ratio, located_anchor, validated_at}`); when the
   files are absent (CI, a fresh clone) it verifies against the attestation and reports
   `validated-by-attestation` instead of failing.
3. The portal renders the two short Lacy quotations only, always with translator and locus, and
   `validate-rights` fails the build on any Tier-C passage over 300 characters.

**Explicitly not doing:** a `git filter-repo` history rewrite. It is destructive, breaks existing
clones, and the owner asked only that the files be ignored. Available later if ever wanted.

**Consequences.** The base's validation discipline survives without redistributing a copyrighted
translation. A fresh clone can build and pass the gate with no access to the restricted text.
