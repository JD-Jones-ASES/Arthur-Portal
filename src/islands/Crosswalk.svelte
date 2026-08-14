<script>
  /**
   * The crosswalk: seven throughlines against every voice that speaks to them.
   *
   * The grid is the research base's central chart, and its most important
   * feature is the empty cells. There are two different kinds of nothing here,
   * and collapsing them would be dishonest:
   *
   *   "silent"  — this voice's surviving work simply does not reach this motif
   *   "gap"     — it does reach it, but the text is not available to quote
   *
   * They are drawn differently, and the legend says which is which.
   */
  let { cuts = [], voices = [], base = "/" } = $props();

  let selected = $state(null);

  const cellFor = (cut, voiceId) => cut.takes.find((t) => t.voice === voiceId) ?? null;

  function cellState(cut, voice) {
    const take = cellFor(cut, voice.id);
    if (!take) return "silent";
    return take.quote_id ? "quoted" : "gap";
  }

  function select(cut, voice) {
    const take = cellFor(cut, voice.id);
    if (!take) {
      selected = { cut, voice, take: null };
      return;
    }
    selected = { cut, voice, take };
  }

  const href = (p) => (base.endsWith("/") ? base.slice(0, -1) : base) + p;
</script>

<div class="crosswalk">
  <div class="crosswalk__scroll">
    <table class="crosswalk__table">
      <caption class="visually-hidden">
        Seven throughlines by twelve voices. Each filled cell is one voice's version of one motif.
      </caption>
      <thead>
        <tr>
          <th scope="col" class="corner"><span class="visually-hidden">Throughline</span></th>
          {#each voices as v}
            <th scope="col" class="vhead" data-branch={v.branch}>
              <span class="vhead__inner">{v.short ?? v.name}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each cuts as cut}
          <tr>
            <th scope="row" class="chead">
              <span class="chead__n">{cut.n}</span>
              <span class="chead__t">{cut.short ?? cut.title}</span>
            </th>
            {#each voices as v}
              {@const st = cellState(cut, v)}
              {@const take = cellFor(cut, v.id)}
              <td
                data-branch={v.branch}
                class="cell cell--{st}"
                class:is-selected={selected && selected.cut.id === cut.id && selected.voice.id === v.id}
              >
                {#if take}
                  <button
                    type="button"
                    onclick={() => select(cut, v)}
                    title="{v.short ?? v.name} — {cut.short ?? cut.title}: {take.term}"
                    aria-label="{v.short ?? v.name} on {cut.title}: {take.term}"
                  >
                    <span class="cell__term">{take.term}</span>
                  </button>
                {:else}
                  <span class="cell__silent" aria-hidden="true">·</span>
                  <span class="visually-hidden">no version</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="crosswalk__legend">
    <span><i class="key key--quoted"></i> a version, with a validated quotation</span>
    <span><i class="key key--gap"></i> a version, but the text cannot be quoted here</span>
    <span><i class="key key--silent"></i> this voice's surviving work does not reach this motif</span>
  </div>

  <div class="crosswalk__detail" aria-live="polite">
    {#if selected}
      <div class="detail" data-branch={selected.voice.branch}>
        <p class="detail__head">
          <a href={href(`/library/${selected.voice.id}/`)}>{selected.voice.name}</a>
          <span aria-hidden="true">×</span>
          <a href={href(`/throughlines/${selected.cut.id}/`)}>{selected.cut.title}</a>
        </p>
        {#if selected.take}
          <p class="detail__term">{selected.take.term}</p>
          <p class="detail__take">{selected.take.take}</p>
          {#if selected.take.gap_note}
            <p class="detail__gap">{selected.take.gap_note}</p>
          {/if}
        {:else}
          <p class="detail__take">This voice does not reach this motif.</p>
        {/if}
      </div>
    {:else}
      <p class="detail__hint">Choose a cell to read that voice&rsquo;s version of that motif.</p>
    {/if}
  </div>
</div>

<style>
  .crosswalk { margin: var(--s6) 0; }
  .crosswalk__scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: var(--radius); }

  .crosswalk__table { border-collapse: collapse; width: 100%; font-size: 0.8rem; }

  .corner { background: var(--paper-sunk); border-bottom: 1px solid var(--line-strong); }

  .vhead {
    background: var(--paper-sunk);
    border-bottom: 2px solid var(--branch);
    border-left: 1px solid var(--line);
    padding: var(--s3) var(--s2);
    vertical-align: bottom;
    font-weight: 400;
    min-width: 4.8rem;
  }
  .vhead__inner {
    display: block;
    font-family: var(--font-rubric);
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    color: var(--branch-ink);
    line-height: 1.2;
  }

  .chead {
    text-align: left;
    background: var(--paper-sunk);
    border-right: 1px solid var(--line-strong);
    padding: var(--s3);
    font-weight: 400;
    min-width: 7.5rem;
    position: sticky;
    left: 0;
    z-index: 1;
  }
  .chead__n {
    font-family: var(--font-display);
    color: var(--ink-faint);
    margin-right: 0.4em;
  }
  .chead__t { font-family: var(--font-rubric); color: var(--ink); }

  .cell {
    border: 1px solid var(--line);
    padding: 0;
    vertical-align: top;
    background: var(--paper);
  }
  .cell button {
    display: block;
    width: 100%;
    height: 100%;
    text-align: left;
    padding: var(--s2) var(--s3);
    border: 0;
    background: var(--branch-wash);
    color: var(--ink-soft);
    font: inherit;
    cursor: pointer;
    line-height: 1.3;
  }
  .cell button:hover { background: color-mix(in srgb, var(--branch) 24%, var(--paper-raised)); color: var(--ink); }
  .cell--gap button { background: transparent; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--branch) 30%, transparent); }
  .cell.is-selected button { outline: 2px solid var(--rubric); outline-offset: -2px; }
  .cell__term {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.72rem;
  }
  .cell--silent { background: var(--paper-sunk); text-align: center; color: var(--line-strong); padding: var(--s3); }

  .crosswalk__legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s2) var(--s5);
    margin-top: var(--s3);
    font-family: var(--font-ui);
    font-size: 0.74rem;
    color: var(--ink-faint);
  }
  .crosswalk__legend span { display: inline-flex; align-items: center; gap: 0.45em; }
  .key { width: 0.9rem; height: 0.9rem; border-radius: 2px; display: inline-block; }
  .key--quoted { background: color-mix(in srgb, var(--lapis) 22%, var(--paper-raised)); border: 1px solid var(--line); }
  .key--gap { background: transparent; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--lapis) 40%, transparent); border: 1px solid var(--line); }
  .key--silent { background: var(--paper-sunk); border: 1px solid var(--line); }

  .crosswalk__detail { margin-top: var(--s5); min-height: 6rem; }
  .detail {
    border-left: 3px solid var(--branch);
    background: var(--paper-raised);
    border-radius: 0 var(--radius) var(--radius) 0;
    padding: var(--s4) var(--s5);
  }
  .detail__head {
    font-family: var(--font-rubric);
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-faint);
    margin: 0 0 var(--s3);
    display: flex;
    gap: 0.5em;
    flex-wrap: wrap;
  }
  .detail__head a { color: var(--branch-ink); }
  .detail__term { font-family: var(--font-display); font-size: 1.05rem; margin: 0 0 var(--s2); }
  .detail__take { margin: 0; color: var(--ink-soft); }
  .detail__gap {
    margin: var(--s3) 0 0;
    padding-top: var(--s3);
    border-top: 1px dashed var(--line-strong);
    font-size: 0.9rem;
    color: var(--ink-faint);
  }
  .detail__hint { color: var(--ink-faint); font-style: italic; margin: 0; }

  .visually-hidden {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
</style>
