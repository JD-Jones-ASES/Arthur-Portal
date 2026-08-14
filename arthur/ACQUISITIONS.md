# Arthur base — source acquisitions (staging ledger)

Public-domain Arthurian texts downloaded this round, **verified** (each file opened and checked
that it is what it claims — title/translator line for Gutenberg, distinctive-content probe for
the archive.org scans), and staged in `raw/_arthur_dl/` (gitignored, re-dumpable from the
sources below). **STATUS: all wired into `base.json` (2026-06-20)** as the wider-corpus sources, with
branch dossiers in `voices/` and 7 new validated quotes folded into the crosswalk; the rough-OCR
texts are cited by work (anchor `?`) and the roughest (Ragnelle, the Mortes) are searchable but
quote-pending. This file remains the provenance record + the gap list.

OCR ratings: **CLEAN** = curated Gutenberg etext; **MODERATE** = archive.org OCR of modern type,
readable with minor artifacts; **ROUGH** = OCR of old type (blackletter / long-s / abbreviations)
— present and fuzzy-searchable, but length quotation needs care (candidate for the deferred
LLM-clean path in `_engine/README.md`).

## Acquired & verified

| Set | Work — translator (date) | Adds (cut) | Source | File (`raw/_arthur_dl/`) | Size | OCR |
|---|---|---|---|---|---|---|
| A | **Sir Gawain and the Green Knight** — Morris ME (EETS) | chivalric test of one conscience (2,4) | Gutenberg #14568 | `Gawain_GreenKnight_Morris_ME.txt` | 265 KB | CLEAN (ME) |
| A | **The Wedding of Sir Gawain and Dame Ragnelle** — in Madden (1839) | sovereignty inverted (1) | archive `syrgawaynecoll6100madduoft` | *(in Madden, below)* | — | ROUGH |
| A | **Quest of the Holy Grail** (*Queste*) — Comfort (1926) | the Grail-as-judgment, Galahad (3) | archive `thequestoftheholygrailcomfort` | `Queste_QuestHolyGrail_Comfort.txt` | 666 KB | MODERATE |
| B | **The Mabinogion** — Lady C. Guest (1849) | the Celtic root: Culhwch, Owain, Peredur, Geraint | Gutenberg #5160 | `Mabinogion_Guest.txt` | 618 KB | CLEAN |
| B | **Wace, *Roman de Brut*** — Mason (1912) | **invents the Round Table** (2); the return (6) | Gutenberg #10472 | `Wace_RomanDeBrut_Mason.txt` | 353 KB | CLEAN |
| B | **Layamon, *Brut*** — Mason (1912) | first English Arthur; Avalon (6) | Gutenberg #14305 | `Layamon_Brut_Mason.txt` | 405 KB | CLEAN |
| B | **Nennius, *Historia Brittonum*** — Giles (1848) | the twelve battles; pseudo-history (1,7) | Gutenberg #1972 | `Nennius_HistoriaBrittonum_Giles.txt` | 100 KB | CLEAN |
| B | **Six Old English Chronicles** — Giles (1848) | **Gildas + Nennius** + Asser/Ethelwerd/Richard (+ a 2nd Geoffrey) | Gutenberg #37848 | `OldEnglishChronicles_Giles.txt` | 1.38 MB | CLEAN |
| C | **Gottfried von Strassburg, *Tristan*** — Weston (vol 1) | the paradigm courtly-love tragedy (4) | archive `storyoftristanan01gottuoft` | `Tristan_Gottfried_Weston_v1.txt` | 174 KB | MODERATE |
| C | **Gottfried, *Tristan*** — Weston (vol 2) | " (continuation) | archive `storyoftristanan02gottuoft` | `Tristan_Gottfried_Weston_v2.txt` | 187 KB | MODERATE |
| D | **Perlesvaus / High History of the Holy Graal** — Evans (1898) | a wild Grail variant (3) | Gutenberg #750 | `Perlesvaus_HighHistoryGraal_Evans.txt` | 875 KB | CLEAN |
| D | **Alliterative *Morte Arthure*** — Brock ME (EETS 1871) | the Roman war + tragic fall; a Malory source (5,6) | archive `mortearthurebrocknewed` | `MorteArthure_Alliterative_Brock.txt` | 520 KB | MOD-ROUGH (ME) |
| D | **Stanzaic *Le Morte Arthur*** — Hemingway ME (1912) | the love-and-death of the fellowship; English route to the *Mort Artu* (4,5,6) | archive `lemortearthurmid00hemiuoft` | `MorteArthur_Stanzaic.txt` | 266 KB | MODERATE (ME) |
| A/D | **Madden, *Syr Gawayne*** (1839) — multi-romance volume | see contents below | archive `syrgawaynecoll6100madduoft` | `SyrGawayne_Madden1839_Ragnell_etc.txt` | 883 KB | ROUGH (1839) |

13 files, ~6.8 MB. All public domain.

## Madden 1839 (`SyrGawayne_Madden1839_…`) — what's in the volume
A single rough-OCR scan that bundles several set-A/D romances (verified each is present by
distinctive markers):
- **The Weddynge of Sir Gawen and Dame Ragnell** (the Loathly Lady; running headers confirmed) — Cut 1.
  **Cleaned (Tier-2):** the riddle + sovereignty answer + loathly description are transcribed to
  `cleaned/ragnelle.txt` (provenance-stamped) and wired as the `ragnelle` source; both Ragnelle
  quotes validate. (The raw scored 0.000 against the fuzzy gate — true blackletter.)
- **The Awntyrs off Arthure** (Gawain + Guinevere's mother's ghost) — Cuts 5/6.
- **Golagros and Gawane** (Scots; the limits of conquest) — Cuts 1/2.
- **Syre Gawene and the Carle of Carlisle** (the beheading-test analogue) — Cut 2.
- A version of **Sir Gawain and the Green Knight** (we also have the cleaner Morris #14568 — prefer that).
- Plus ballads (incl. *The Marriage of Sir Gawaine*, a Ragnelle variant).
*Rough 1839 type (long-s → "f", abbreviations "Sʳ/K:", thorns). `ſ→s` + thresholds (Tier-1) aren't
enough for the worst of it, so Ragnelle is quoted via a Tier-2 cleaned derivative (above); the other
romances stay searchable-but-rough until cleaned or re-sourced. OCR policy: `docs/bases/_engine/README.md`.*

## Gaps — PD material NOT obtained (your to-find list)
- **Chrétien's *Perceval* (Conte du Graal)** — *no clean public-domain English translation found.*
  The modern ones (Bryant, Kibler) are in-copyright; A. S. Kline's (poetryintranslation.com, 2019)
  is free for non-commercial use but **not PD** (so validation-only at best). The Grail-origin
  material is reachable via Wolfram (have), Perlesvaus (have), and the ME **Sir Perceval of Galles**
  (PD, in Halliwell's *Thornton Romances*, 1844 — not downloaded).
- **Mort Artu (French Vulgate), standalone PD English** — none clean; covered by Malory XX–XXI
  (have) + the Stanzaic *Morte* (have, the English verse of the same events).
- **Prose Merlin** — Wheatley's EETS edition is on archive.org (`merlinorearlyhis…`, 4 parts), PD,
  **not downloaded** (redundant with our Geoffrey/Vulgate/Malory Merlin; easy to add if wanted).
- **Béroul / Thomas (Anglo-Norman *Tristan*)** — older PD translations exist; not downloaded
  (Gottfried, the major version, is in hand).
- **Sir Launfal (Chestre), Ywain and Gawain, Lybeaus Desconus, Sir Perceval of Galles** — PD ME in
  Halliwell's *Thornton Romances* (1844) / Ritson / EETS; minor, not downloaded.
- **Robert de Boron (*Joseph* / *Merlin* verse), PD English** — scarce; not found.
- **Cleaner editions of the Madden romances** — if Madden's 1839 OCR proves too rough to quote, the
  Awntyrs + Golagros are in Amours, *Scottish Alliterative Poems* (EETS, PD) — better OCR.

## Notes
- **Duplicates to avoid double-wiring:** #37848 contains a second Geoffrey (we already have
  `geoffrey`); use #37848 only for **Gildas + Nennius**. Madden has a SGGK; prefer Morris #14568.
- **Next step:** decide which to wire into `base.json`. Each needs a source entry + an anchor scheme
  (the Gutenberg verse/prose mostly fit `chapter`/`book_chapter` or no-scheme; the ME/scan texts may
  need a small new scheme or just no-anchor + fuzzy search). Then mine seed quotes, `validate`, and
  fold the new voices into `ANATOMY.md` / `concept_map.json`.
