// Shared site helpers and constants.
//
// `withBase` prefixes in-app links with the configured base path so the same code works
// at "/" (local preview, LOCAL_ROOT=1) and at "/Arthur-Portal/" (GitHub Pages).

const BASE = import.meta.env.BASE_URL;

export function withBase(path = "/") {
  const b = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export const SITE = {
  name: "The Arthur Portal",
  short: "Arthur",
  tagline: "There is no “the legend.” Five centuries, many hands, one inheritance re-cut.",
  description:
    "A source-cited reading room for the Matter of Britain — the famous stories, the throughlines, " +
    "the Grail, and the knights, tracked across every version that disagrees.",
  repo: "https://github.com/JD-Jones-ASES/Arthur-Portal",
};

// The manuscript traditions. One hue each, carried everywhere via data-branch.
// This is the mechanism that makes House Constraint 1 — name the version — visible.
export const BRANCHES = {
  chronicle: {
    id: "chronicle",
    label: "Chronicle",
    blurb: "The pseudo-historical spine: Gildas, Nennius, Geoffrey, Wace, Layamon.",
    span: "c. 540 – c. 1200",
  },
  welsh: {
    id: "welsh",
    label: "Welsh",
    blurb: "The Celtic root — the war-band Arthur of the Mabinogion.",
    span: "c. 1100 – c. 1400 (older matter)",
  },
  french: {
    id: "french",
    label: "French romance",
    blurb: "Chrétien, the Vulgate, the Queste, Perlesvaus — where romance and the Grail are invented.",
    span: "c. 1170 – c. 1235",
  },
  german: {
    id: "german",
    label: "German",
    blurb: "Wolfram and Gottfried — the counter-voices on the Grail and on love.",
    span: "c. 1200 – c. 1215",
  },
  english: {
    id: "english",
    label: "English",
    blurb: "Malory, the two Mortes, the Gawain romances — the tragic English spine.",
    span: "c. 1350 – 1485",
  },
  reception: {
    id: "reception",
    label: "Reception",
    blurb: "What later ages did with the inheritance.",
    span: "1859 – 1889",
  },
};

export const BRANCH_ORDER = ["chronicle", "welsh", "french", "german", "english", "reception"];

// Primary navigation. `match` is a path prefix used for aria-current.
export const NAV = [
  { href: "/start/", label: "Start", match: "/start" },
  { href: "/stories/", label: "Stories", match: "/stories" },
  { href: "/throughlines/", label: "Throughlines", match: "/throughlines" },
  { href: "/grail/", label: "The Grail", match: "/grail" },
  { href: "/knights/", label: "Knights", match: "/knights" },
  { href: "/read/", label: "Read", match: "/read" },
  { href: "/library/", label: "Library", match: "/library" },
  { href: "/method/", label: "Method", match: "/method" },
];
