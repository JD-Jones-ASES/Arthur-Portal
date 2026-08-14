/**
 * Reader controls: layer toggles, text size, and the glossary tip.
 *
 * The quotation and glossary layers are always rendered into the HTML and shown
 * or hidden with CSS, so toggling costs nothing and never reflows the text out
 * from under the reader's eye. Preferences persist across chapters.
 */

const STORE = "arthur-reader";

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
}

function writePrefs(p) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p));
  } catch {}
}

function init() {
  const reader = document.querySelector(".reader");
  if (!reader) return;

  const prefs = readPrefs();

  /* ---- layer toggles ---- */
  for (const layer of ["quotes", "glosses"]) {
    const on = prefs[layer] !== false;
    reader.dataset[layer === "quotes" ? "showQuotes" : "showGlosses"] = String(on);
    const btn = reader.querySelector(`[data-toggle="${layer}"]`);
    if (!btn) continue;
    btn.setAttribute("aria-pressed", String(on));
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(next));
      reader.dataset[layer === "quotes" ? "showQuotes" : "showGlosses"] = String(next);
      const p = readPrefs();
      p[layer] = next;
      writePrefs(p);
    });
  }

  /* ---- text size ---- */
  const size = prefs.size ?? "m";
  reader.dataset.size = size;
  for (const btn of reader.querySelectorAll("[data-size]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.size === reader.dataset.size));
    btn.addEventListener("click", () => {
      reader.dataset.size = btn.dataset.size;
      const p = readPrefs();
      p.size = btn.dataset.size;
      writePrefs(p);
      for (const b of reader.querySelectorAll("[data-size]")) {
        b.setAttribute("aria-pressed", String(b.dataset.size === reader.dataset.size));
      }
    });
  }

  /* ---- glossary tip ----
     Shown on hover and on focus, so it is reachable by keyboard as well as
     mouse. Positioned in the viewport rather than inside the paragraph so it
     never disturbs the line rhythm of the text. */
  const tip = document.getElementById("gloss-tip");
  if (tip) {
    let hideTimer = null;

    const show = (el) => {
      if (reader.dataset.showGlosses !== "true") return;
      clearTimeout(hideTimer);
      tip.textContent = "";
      const term = document.createElement("strong");
      term.textContent = el.dataset.term;
      const sep = document.createTextNode("  ");
      const gloss = document.createElement("span");
      gloss.textContent = el.dataset.gloss;
      tip.append(term, sep, gloss);
      tip.hidden = false;

      const r = el.getBoundingClientRect();
      const tr = tip.getBoundingClientRect();
      const margin = 8;
      let left = r.left + r.width / 2 - tr.width / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - tr.width - margin));
      const above = r.top > tr.height + 16;
      tip.style.left = `${left}px`;
      tip.style.top = `${above ? r.top - tr.height - 8 : r.bottom + 8}px`;
    };

    const hide = () => {
      hideTimer = setTimeout(() => {
        tip.hidden = true;
      }, 80);
    };

    for (const el of reader.querySelectorAll(".gl")) {
      el.addEventListener("mouseenter", () => show(el));
      el.addEventListener("mouseleave", hide);
      el.addEventListener("focus", () => show(el));
      el.addEventListener("blur", hide);
      el.addEventListener("click", (e) => {
        e.preventDefault();
        show(el);
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") tip.hidden = true;
    });
    window.addEventListener("scroll", () => {
      tip.hidden = true;
    }, { passive: true });
  }

  /* ---- keyboard chapter navigation ---- */
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") document.querySelector(".reader__nav-link--prev")?.click();
    if (e.key === "ArrowRight") document.querySelector(".reader__nav-link--next")?.click();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
