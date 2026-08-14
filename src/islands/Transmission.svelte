<script>
  /**
   * One inheritance, many hands.
   *
   * Voices are placed on a time axis and joined by the lines along which the
   * material actually travelled. Choosing a motif highlights the route that
   * motif took and prints what each hand changed about it — which is the whole
   * argument of this portal in one view: not a story being copied, but an object
   * being re-cut at every stop.
   */
  let { voices = [], edges = [], motifs = [], base = "/" } = $props();

  let motif = $state(null);

  // The dated voices span 1136 (Geoffrey) to 1859 (Tennyson). Starting the axis
  // at 500 to include the undated chronicle background wasted more than half the
  // width on an empty span, so the axis covers the period actually occupied.
  const MIN = 1100;
  const MAX = 1900;
  const W = 1000;
  const ROW = 44;
  const PAD_L = 132;
  const PAD_T = 34;

  const x = (year) => PAD_L + ((year - MIN) / (MAX - MIN)) * (W - PAD_L - 30);

  // Order by date; each voice gets its own row so the lines are readable.
  const ordered = $derived([...voices].sort((a, b) => a.floruit - b.floruit));
  const rowOf = $derived(new Map(ordered.map((v, i) => [v.id, i])));
  const y = (id) => PAD_T + rowOf.get(id) * ROW;
  const height = $derived(PAD_T + ordered.length * ROW + 20);

  const activePath = $derived(motif ? motifs.find((m) => m.id === motif) : null);
  const activeVoices = $derived(new Set(activePath ? activePath.path.map((p) => p.voice) : []));

  function edgeActive(e) {
    if (!activePath) return false;
    const seq = activePath.path.map((p) => p.voice);
    for (let i = 0; i < seq.length - 1; i++) {
      if (seq[i] === e.from && seq[i + 1] === e.to) return true;
    }
    return false;
  }

  const CENTURIES = [1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850];
  const href = (p) => (base.endsWith("/") ? base.slice(0, -1) : base) + p;
</script>

<div class="tx">
  <div class="tx__controls" role="group" aria-label="Choose a motif to trace">
    <button class="tx__btn" class:is-on={!motif} type="button" onclick={() => (motif = null)}>
      All lines of descent
    </button>
    {#each motifs as m}
      <button
        class="tx__btn"
        class:is-on={motif === m.id}
        type="button"
        onclick={() => (motif = motif === m.id ? null : m.id)}
      >
        {m.label}
      </button>
    {/each}
  </div>

  <div class="tx__scroll">
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img"
         aria-label="A diagram of which Arthurian author inherited from which, on a time axis">
      <!-- century rules -->
      {#each CENTURIES as c}
        <line x1={x(c)} y1={PAD_T - 22} x2={x(c)} y2={height - 14} class="tx__rule" />
        <text x={x(c)} y={PAD_T - 26} class="tx__century">{c}</text>
      {/each}

      <!-- edges -->
      {#each edges as e}
        {@const x1 = x(voices.find((v) => v.id === e.from)?.floruit ?? MIN)}
        {@const y1 = y(e.from)}
        {@const x2 = x(voices.find((v) => v.id === e.to)?.floruit ?? MIN)}
        {@const y2 = y(e.to)}
        <path
          d={`M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
          class="tx__edge"
          class:is-contested={e.contested}
          class:is-none={e.none}
          class:is-active={edgeActive(e)}
          class:is-dim={activePath && !edgeActive(e)}
        />
      {/each}

      <!-- nodes -->
      {#each ordered as v}
        {@const cx = x(v.floruit)}
        {@const cy = y(v.id)}
        <g
          class="tx__node"
          class:is-active={activeVoices.has(v.id)}
          class:is-dim={activePath && !activeVoices.has(v.id)}
          data-branch={v.branch}
        >
          <text x={PAD_L - 12} y={cy + 4} class="tx__name" text-anchor="end">{v.short ?? v.name}</text>
          <circle cx={cx} cy={cy} r="6" class="tx__dot" />
          <text x={cx + 12} y={cy + 4} class="tx__year">{v.floruit}</text>
        </g>
      {/each}
    </svg>
  </div>

  <div class="tx__legend">
    <span><i class="k k--solid"></i> inheritance</span>
    <span><i class="k k--dash"></i> direction unresolved</span>
    <span><i class="k k--dot"></i> no influence, despite the overlap</span>
  </div>

  <div class="tx__detail" aria-live="polite">
    {#if activePath}
      <h3>{activePath.label}, hand to hand</h3>
      {#if activePath.note}
        <p class="tx__note">{activePath.note}</p>
      {/if}
      <ol class="tx__steps">
        {#each activePath.path as step, i}
          {@const v = voices.find((vv) => vv.id === step.voice)}
          <li data-branch={v?.branch}>
            <span class="tx__step-n">{i + 1}</span>
            <div>
              <a class="tx__step-voice" href={href(`/library/${step.voice}/`)}>{v?.short ?? step.voice}</a>
              <span class="tx__step-year">{v?.floruit}</span>
              <p>{step.change}</p>
            </div>
          </li>
        {/each}
      </ol>
      <p class="tx__more">
        <a href={href(`/throughlines/${activePath.cut}/`)}>Read this as a throughline &rarr;</a>
      </p>
    {:else}
      <p class="tx__hint">
        Choose a motif above to trace the route it actually travelled, and see what each hand changed
        about it.
      </p>
    {/if}
  </div>
</div>

<style>
  .tx__controls { display: flex; flex-wrap: wrap; gap: var(--s2); margin-bottom: var(--s5); }
  .tx__btn {
    font-family: var(--font-ui);
    font-size: 0.76rem;
    letter-spacing: 0.03em;
    padding: 0.36em 0.68em;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-soft);
    cursor: pointer;
  }
  .tx__btn:hover { color: var(--ink); border-color: var(--ink-faint); }
  .tx__btn.is-on { color: var(--rubric); border-color: var(--rubric); background: color-mix(in srgb, var(--rubric) 8%, transparent); }

  .tx__scroll { overflow-x: auto; }
  svg { min-width: 640px; display: block; }

  .tx__rule { stroke: var(--line); stroke-width: 1; }
  .tx__century { fill: var(--ink-faint); font-family: var(--font-ui); font-size: 10px; text-anchor: middle; }

  .tx__edge { fill: none; stroke: var(--ink-faint); stroke-width: 1.8; opacity: 0.55; }
  .tx__edge.is-contested { stroke-dasharray: 5 4; }
  .tx__edge.is-none { stroke-dasharray: 1 5; opacity: 0.4; }
  .tx__edge.is-active { stroke: var(--rubric); stroke-width: 2.6; opacity: 1; }
  .tx__edge.is-dim { opacity: 0.1; }

  .tx__name { fill: var(--ink-soft); font-family: var(--font-rubric); font-size: 12px; }
  .tx__dot { fill: var(--branch); stroke: var(--paper); stroke-width: 2; }
  .tx__year { fill: var(--ink-faint); font-family: var(--font-ui); font-size: 9.5px; }
  .tx__node.is-active .tx__dot { r: 8; stroke: var(--rubric); }
  .tx__node.is-active .tx__name { fill: var(--ink); }
  .tx__node.is-dim { opacity: 0.3; }

  .tx__legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--s2) var(--s5);
    margin-top: var(--s3);
    font-family: var(--font-ui);
    font-size: 0.72rem;
    color: var(--ink-faint);
  }
  .tx__legend span { display: inline-flex; align-items: center; gap: 0.4em; }
  .k { width: 1.6rem; height: 0; border-top: 2px solid var(--line-strong); display: inline-block; }
  .k--dash { border-top-style: dashed; }
  .k--dot { border-top-style: dotted; }

  .tx__detail { margin-top: var(--s6); min-height: 6rem; }
  .tx__detail h3 { margin: 0 0 var(--s4); }
  .tx__hint { color: var(--ink-faint); font-style: italic; }
  .tx__steps { list-style: none; margin: 0; padding: 0; }
  .tx__steps li {
    display: grid;
    grid-template-columns: 2rem 1fr;
    gap: var(--s3);
    padding: var(--s3) 0;
    border-bottom: 1px solid var(--line);
  }
  .tx__step-n {
    font-family: var(--font-rubric);
    font-size: 0.82rem;
    color: var(--branch);
    padding-top: 0.15em;
  }
  .tx__step-voice { font-family: var(--font-display); color: var(--branch-ink); }
  .tx__step-year { font-family: var(--font-ui); font-size: 0.72rem; color: var(--ink-faint); margin-left: 0.5em; }
  .tx__steps p { margin: var(--s1) 0 0; color: var(--ink-soft); }
  .tx__more { margin-top: var(--s4); font-size: 0.9rem; }
  .tx__note {
    margin: 0 0 var(--s4);
    padding: var(--s3) var(--s4);
    border-left: 3px solid var(--gold);
    background: color-mix(in srgb, var(--gold) 7%, var(--paper-raised));
    border-radius: 0 var(--radius) var(--radius) 0;
    font-size: 0.92rem;
    color: var(--ink-soft);
  }
</style>
