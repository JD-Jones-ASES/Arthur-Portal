# Arthuriana — a Matter-of-Britain research base

A persistent, **quote-validated** base for dissecting the Arthurian legend across its
incompatible versions, built so essays can reach for the canon without re-reading five
centuries of romance and chronicle. The studio's standing framework for **the legend as a
five-century argument conducted in narrative** — kingship, the Grail, chivalric decline, eros,
the wound, the return, and fate.

This is to the Matter of Britain what the realism base is to political power: the infrastructure
stays; the essays draw on it. Same engine (`docs/bases/_engine/`), same discipline (validate
every quote), opposite intellectual engine — where realism shows idioms *converging* on one
fact, Arthuriana shows one motif *diverging* into incompatible meanings.

## The premise
There is no "the legend." Every author inherited the same organs — a sword, a table, a grail, a
betrayal, a wound, a prophecy — and re-cut each to mean something different. Geoffrey's
conqueror-king is not Malory's elected boy is not the Vulgate's sin-born heir; Wolfram's Grail
(a stone healed by pity) is not the Vulgate's (a sacred vessel whose purity-logic, perfected in
the off-corpus *Queste*, becomes judgment). **The divergences
are the material.** The base lines the versions up so that, handed any motif, you can name what
each voice made it carry. The organizing discipline: *name the version, never flatten it.*

## The voices (one inheritance, many hands)
Chronological-genetic — who invented what, who inherited from whom:
- **Geoffrey of Monmouth** (c. 1136) — *the founder.* Turned a Welsh war-leader into a **king
  of Britain**; gave the legend its political-historical skeleton and Merlin's prophecies. Root
  of cuts 1, 6, 7; also supplies Cut 5 (Arthur's deadly wound).
- **Chrétien de Troyes** (c. 1170–90) — *the inventor.* Created courtly Arthurian **romance**
  and, almost in passing, the Lancelot–Guinevere love and (in *Perceval*, not on hand) the
  Grail. The most generative hand. Cuts 2, 4.
- **Wolfram von Eschenbach** (c. 1200–10) — *the humanist.* Rebuilt the Grail as a **stone** and
  the cure as **compassion**, not purity. The counter-voice on the Grail and the wound. Cuts 3, 5.
- **The Vulgate / Lancelot-Grail** (c. 1215–35) — *the systematizer.* Welded romance to theology
  into a vast prose cycle with a doom built into its architecture; Malory's main source. Cuts 1
  (the Grail outranks the sword), 3 (origin), 4.
- **Malory** (c. 1469) — *the keystone / the English spine.* Compiled the streams into one
  tragic English book and registered the *cost* of every motif. Clean and citeable by
  Book.chapter. **All seven cuts** (the full Caxton text, Books I–XXI; vols `malory1` I–IX +
  `malory2` X–XXI).

### The wider corpus (added witnesses, with their own dossiers in `voices/`)
- **The Chroniclers** — Gildas, Nennius, Wace, Layamon: the pseudo-historical spine; Wace *invents*
  the Round Table, Layamon sends Arthur to Avalon (cuts 1, 2, 6, 7).
- **The Mabinogion** (Guest) — the Celtic root: Culhwch (the war-band Arthur), Peredur (the Welsh
  Grail/unasked question), Owain & Geraint (cuts 1, 3, 4).
- **The Grail Romances** — the Queste (judgment-by-purity) and Perlesvaus (the violent Grail): cut 3.
- **Gottfried von Strassburg** — *Tristan*: the other adultery, love as fate (cut 4).
- **The English Mortes** — the Alliterative & Stanzaic *Morte*: Malory's sources for the fall (cuts 4, 5, 6).
- **The Gawain Romances** — *Sir Gawain and the Green Knight* + Madden's Ragnelle/Awntyrs/Golagros/Carle:
  the code on one knight, and sovereignty inverted (cuts 1, 2).

A note on what's *not* yet here: **Chrétien's *Perceval*** (no clean PD English) and the Vulgate's own
*Queste*/*Mort Artu* remain off-corpus; **Tennyson** (*Idylls*) and **Twain** (*Connecticut Yankee*)
are natural v2 additions — see "Extending the base."

## How to use it
1. **Read `ANATOMY.md`** — the crosswalk. Pick the cut you need (source of rule / fellowship /
   the Grail / the betrayal / the wound / the return / foreknowledge), and read each voice's
   take across the row.
2. **Pull validated quotes** from `index/quotes.json` (or render: `QUOTES.md`). Each is located
   in its source and cited (`Malory III.xv`, `Bk XI, ch. II`, `Lacy [539]`).
3. **Mine more** with the shared engine, always passing the slug:
   `python docs/bases/_engine/tools/quote.py --base arthur "<phrase>"` — whitespace-tolerant
   search returning anchored hits. Add keepers to `index/quotes.json`, then
   **`python docs/bases/_engine/tools/validate.py --base arthur`** (the gate; exits non-zero on
   any unlocatable quote). Rebuild after a raw re-dump:
   `python docs/bases/_engine/tools/build_index.py --base arthur`.
4. **Apply** via `CASEBOOK.md` (the worked example) or the `chronicler` subagent.

## House constraints (non-negotiable)
1. **Name the version — never flatten the variants.** Every claim is tagged to a voice. When two
   voices disagree, render the disagreement; collapsing them into a generic "Arthurian myth" is
   the cardinal sin. *(The structural analogue of realism's symmetric critique; tag such nodes
   `version-divergence`.)*
2. **The cost is always counted.** Wherever a motif appears, ask what it **depletes** — the Grail
   that empties the fellowship, the love that cracks the polity, the oath that breeds the
   violence, the foreknowledge that saves no one. The Matter of Britain is a literature of tragic
   *cost*, not triumph; an essay that celebrates Camelot without counting its price has misread
   the canon. *(This is the base's load-bearing thesis-constraint — its "Pareto = Foxes & Lions."
   Tag `the-cost`.)*
3. **IP-safety: cite the literary canon; evoke but never name modern adaptations.** Draw on and
   cite the pre-1500 texts and their public-domain translations. You may *evoke* archetypes ("a
   boy drawing a sword from stone," "a wounded king in a barren land") but never name or lean on
   modern franchise adaptations — no BBC *Merlin*, films, anime, games, studio designs. *(Mirrors
   `art/ART_DIRECTION.md`: copyright/trademark exposure on a public post; the associations they
   trigger; and truth to the archetype, not the licensed crystal.)*
4. **Validate every quote, and observe the translation-copyright line.** Malory is clean and
   citeable by Book.chapter; Geoffrey's OCR is moderate (validate before quoting). Quote from
   **public-domain translations** (Chrétien: Comfort; Geoffrey: the Evans/Thompson family;
   Wolfram: Weston). Treat **in-copyright translations as validation-only** — above all the
   **Lacy Vulgate** (`raw/`, gitignored, never redistributed): paraphrase the idea, quote at most
   a short fair-use phrase, cite the translator. Every quote carries voice + locus.
5. **Flag the interpretive slide** *(the analogue of realism's descriptive→normative danger)*:
   - **PRIMARY — the mysticism/therapy slide.** Dissolving the *specific, conflicting* texts into
     one timeless wisdom — Jungian/New-Age "Grail archetype," "the hero's journey,"
     Camelot-as-self-help. It moves from *what a given author wrote* to *what the myth eternally
     means for you*, and so erases Constraint 1. Flag it whenever an essay reaches for "the myth
     tells us that we must…"
   - **SECONDARY — the nationalist pseudo-history slide.** The "real King Arthur" temptation —
     treating Geoffrey's fiction as recoverable Dark-Age fact, or enlisting the legend for an
     ethnic origin story. Geoffrey *was* propaganda; the base studies that, it does not extend it.
6. **Grant each text its own metaphysics.** The Grail is a Christian sacrament in the Vulgate and
   a neutral stone in Wolfram; report what each text claims about transcendence without ruling on
   whether transcendence is real. Compare the metaphysics; don't import one.

## Map of the base
```
ARTHUR.md       this file — orientation + how to use
base.json       source registry + metadata (drives the shared engine)
ANATOMY.md      the crosswalk (seven cuts × the voices)           <- start here
TAGS.md         the controlled vocabulary
QUOTES.md       the validated quote ledger (rendered)
CASEBOOK.md     "Camelot, an institution designed to fail" through the seven cuts
ACQUISITIONS.md provenance of the added public-domain sources + remaining gaps
voices/         principal: geoffrey · chretien · wolfram · vulgate · malory
                wider corpus: the-chroniclers · the-mabinogion · the-grail-romances ·
                gottfried-tristan · the-english-mortes · the-gawain-romances
index/          quotes.json · concept_map.json (sources of truth) · corpus_index.json
```
Tooling is shared across all bases: `docs/bases/_engine/tools/` — always run with `--base arthur`.
Raw sources live in `raw/` (gitignored; the Lacy Vulgate is copyrighted, never redistributed);
the durable knowledge here is the prose + validated short quotes + `index/quotes.json`.

## Extending the base
The corpus is broad but still has named gaps (see `ANATOMY.md` → coverage map and `ACQUISITIONS.md`).
The highest-value additions, each a `raw/` drop + a re-mine:
- **Chrétien's *Perceval*** → his open Grail and the unasked question (cut 3). *No clean PD English
  translation found* — the real outstanding gap (we make do via Peredur, Wolfram, Perlesvaus, Malory).
- **The Vulgate's own *Queste* + *Mort Artu*** (Lacy vols IV–V) → the Grail-as-judgment and the
  cycle's terminal close in the *Vulgate's* voice (we now hold Comfort's PD Queste + the English
  Mortes; Malory carries the English version). Copyright: validation-only.
- **Clean editions of the rough-OCR Middle English** (Madden's Ragnelle/Awntyrs/Golagros; the two
  Mortes) → to make them quotable at length, or run them through the LLM-clean path.
- **v2 reception voices:** Tennyson's *Idylls* (PD; Camelot rises and rots — the
  civilizational-decline seam) and Twain's *Connecticut Yankee* (PD; disenchantment). White as
  validation-only.
