(async function () {
  const CLUSTER_COLORS = ['--red', '--data-blue', '--data-purple'];

  const LEVER_GROUPS = [
    { id: 'productPage',       label: 'Product Page',        members: ['productPage'] },
    { id: 'listicle',          label: 'Listicle',            members: ['onsiteListicle'] },
    { id: 'backlink',          label: 'Backlink',            members: ['backlink'] },
    { id: 'guestPost',         label: 'Guest Post Listicle', members: ['guestPostListicle', 'guestPostListicle2'] },
    { id: 'listicleInclusion', label: 'Listicle Inclusion',  members: ['listicleInclusion'] },
    { id: 'redditSerp',        label: 'Reddit SERP',         members: ['redditThreadOnSerp', 'brandEndorsingComment', 'linkSubreddit'] },
    { id: 'redditLlms',        label: 'Reddit LLMs',         members: ['redditThreadLlm', 'brandEndorsingCommentLlm', 'linkSubredditLlm'] },
    { id: 'linkedin',          label: 'LinkedIn',            members: ['linkedinPulseArticle'] },
    { id: 'schema',            label: 'Schema',              members: ['schemaMarkup'] }
  ];
  const STATUS_RANK = { done: 3, inProgress: 2, proposed: 1, notDone: 0 };
  const RANK_STATUS = ['notDone', 'proposed', 'inProgress', 'done'];
  const KEYWORD_LIMIT = 10;

  // Color dot per deliverable type — drives the timeline milestone dots.
  const TYPE_DOT_COLOR = {
    'Onsite Product Page':      '--data-green',
    'Onsite Blog Listicle':     '--data-blue',
    'Guest Post Listicle':      '--red',
    'Listicle Inclusion':       '--data-slate',
    'Reddit SEO Post':          '--data-orange',
    'Reddit VIRAL GROWTH Post': '--data-orange',
    'Reddit Comments':          '--data-orange',
    'Backlink':                 '--data-amber',
    'Backlink (Premium)':       '--data-amber',
    'YouTube Video':            '--data-purple',
    'YouTube Optimization':     '--data-purple',
    'Wikipedia':                '--data-slate',
    'Page Refresh':             '--data-teal',
    'LinkedIn Article':         '--data-indigo'
  };

  const app = document.getElementById('app');
  const updatedEl = document.getElementById('updated');
  const brandLogo = document.getElementById('brandLogo');
  const brandTitle = document.getElementById('brandTitle');
  const tocNav = document.getElementById('tocNav');
  const tocToggle = document.getElementById('tocToggle');
  const tocEntries = [];

  let data;
  try {
    const res = await fetch('./data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    app.textContent = `Failed to load data.json: ${err.message}`;
    return;
  }

  document.title = data.title;
  brandTitle.textContent = data.title;
  if (data.brand?.name) {
    const boltSvg = '<svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M14 0 L2 18 H11 L9 32 L22 12 H13 Z"/></svg>';
    brandLogo.innerHTML = boltSvg + initials(data.brand.name);
  }
  renderUpdated(data.lastUpdated);

  app.classList.remove('loading');
  app.textContent = '';

  // Hero
  const hero = el('div', { className: 'hero' });
  hero.appendChild(buildHeroBolts());
  const heroContent = el('div', { className: 'hero-content' });
  heroContent.appendChild(el('span', { className: 'eyebrow', text: 'Strategy Brief · April 2026' }));
  heroContent.appendChild(renderHeroHeadline(data.title));
  heroContent.appendChild(el('p', { className: 'subtitle', text: data.subtitle }));
  hero.appendChild(heroContent);
  app.appendChild(hero);

  const sections = data.overview?.sections || [];
  const byKind = (kind) => sections.find((s) => s.kind === kind);
  const byTitle = (re) => sections.find((s) => re.test(s.title));

  let sectionCounter = 0;
  function addSection(title) {
    const num = String(++sectionCounter).padStart(2, '0');
    const id = `sec-${num}`;
    const sec = el('section', { className: 'section', attrs: { id } });
    sec.appendChild(buildSectionHead(num, title));
    tocEntries.push({ id, num, title });
    return sec;
  }

  // THE OPPORTUNITY
  const opportunity = byTitle(/THE OPPORTUNITY/i);
  if (opportunity) {
    const sec = addSection('The Opportunity');
    sec.appendChild(el('p', { className: 'prose-body', text: opportunity.body }));
    app.appendChild(sec);
  }

  // OUR APPROACH
  const approach = sections.find((s) => s.kind === 'approach');
  if (approach) {
    const sec = addSection('Our Approach');
    if (approach.intro) sec.appendChild(el('p', { className: 'section-intro', text: approach.intro }));
    sec.appendChild(renderApproachGrid(approach));
    app.appendChild(sec);
  }

  // Visualization 1: Keyword universe scatter
  if (data.clusters?.groups?.length) {
    const sec = addSection('Keyword Universe');
    sec.appendChild(el('p', {
      className: 'section-intro',
      text: 'Every buyer keyword across the image, logo, and creative clusters — plotted by difficulty vs. search volume. Bigger, lower-left means easier to rank with larger payoff.'
    }));
    const chartWrap = el('div', { className: 'chart-wrap' });
    chartWrap.appendChild(buildChartLegend(data.clusters));
    const chartDiv = el('div', { id: 'clustersChart' });
    chartWrap.appendChild(chartDiv);
    sec.appendChild(chartWrap);
    app.appendChild(sec);
    requestAnimationFrame(() => initClustersChart(chartDiv, data.clusters));
  }

  // Clusters tables
  if (data.clusters?.groups?.length) {
    const sec = addSection('Keyword Clusters');
    sec.appendChild(el('p', {
      className: 'section-intro',
      text: 'Full keyword universe grouped into three clusters, sorted by search volume. KD pills flag keywords by how hard they are to rank.'
    }));
    sec.appendChild(renderClusters(data.clusters));
    app.appendChild(sec);
  }

  // STRATEGIC ALLOCATION
  const strategic = byTitle(/STRATEGIC ALLOCATION/i);
  if (strategic) {
    const sec = addSection('Strategic Allocation');
    sec.appendChild(el('p', { className: 'prose-body', text: strategic.body }));
    app.appendChild(sec);
  }

  // Visualization 2: Keyword tracker
  if (data.geoTracker?.keywords?.length) {
    const sec = addSection('Keyword Tracker');
    sec.appendChild(el('p', {
      className: 'section-intro',
      text: 'Top 10 priority keywords × 9 grouped SEO and GEO levers. Every cell shows whether we plan to activate that surface for that keyword — the at-a-glance picture of where Ideogram will show up.'
    }));
    sec.appendChild(renderMatrix(data.geoTracker));
    app.appendChild(sec);
  }

  // HOW THE CREDIT SYSTEM
  const credits = byKind('creditSystem');
  if (credits) {
    const sec = addSection('The Credit System');
    if (credits.intro) sec.appendChild(el('p', { className: 'section-intro', text: credits.intro }));
    sec.appendChild(renderCredits(credits));
    app.appendChild(sec);
  }

  // Visualization 3: 3-Month Roadmap (vertical timeline)
  if (data.roadmap?.months?.length) {
    const sec = addSection('Monthly Roadmap');
    sec.appendChild(el('p', {
      className: 'section-intro',
      text: 'Every deliverable across the three-month engagement, grouped by type. Each milestone shows the count, credit cost, and which keywords it covers.'
    }));
    sec.appendChild(renderRoadmap(data.roadmap));
    app.appendChild(sec);
  }

  // HOW TO NAVIGATE
  const nav = byKind('navigation');
  if (nav && nav.items.length) {
    const sec = addSection('How to Navigate');
    sec.appendChild(renderNav(nav));
    app.appendChild(sec);
  }

  // Footer
  app.appendChild(renderFooter(data.overview?.footer || ''));

  // Build TOC + wire up toggle + scroll highlight
  buildToc();
  setupTocToggle();
  setupTocScrollSpy();

  // Dark mode re-init
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener?.('change', () => {
    const chartDiv = document.getElementById('clustersChart');
    if (chartDiv) {
      echarts.dispose(chartDiv);
      initClustersChart(chartDiv, data.clusters);
    }
  });

  /* ============================================================
     Helpers
  ============================================================ */

  function el(tag, opts = {}) {
    const node = document.createElement(tag);
    if (opts.className) node.className = opts.className;
    if (opts.id) node.id = opts.id;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.html != null) node.innerHTML = opts.html;
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    if (opts.children) for (const c of opts.children) if (c) node.appendChild(c);
    return node;
  }

  function buildSectionHead(num, title) {
    const head = el('div', { className: 'section-head' });
    head.appendChild(el('span', { className: 'section-number', text: num }));
    head.appendChild(el('h2', { className: 'section-title', text: title }));
    return head;
  }

  function buildToc() {
    if (!tocNav) return;
    tocNav.textContent = '';
    tocEntries.forEach((entry) => {
      const a = document.createElement('a');
      a.href = `#${entry.id}`;
      a.dataset.id = entry.id;
      a.innerHTML = `<span class="toc-num">${entry.num}</span><span class="toc-text">${escapeHtml(entry.title)}</span>`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(entry.id);
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 76;
          window.scrollTo({ top, behavior: 'smooth' });
          history.replaceState(null, '', `#${entry.id}`);
        }
      });
      tocNav.appendChild(a);
    });
  }

  function setupTocToggle() {
    if (!tocToggle) return;
    const stored = localStorage.getItem('tocHidden');
    if (stored === '1') document.body.classList.add('toc-hidden');
    tocToggle.addEventListener('click', () => {
      const hidden = document.body.classList.toggle('toc-hidden');
      localStorage.setItem('tocHidden', hidden ? '1' : '0');
    });
  }

  function setupTocScrollSpy() {
    if (!tocNav || !('IntersectionObserver' in window)) return;
    const linkById = new Map();
    tocNav.querySelectorAll('a').forEach((a) => linkById.set(a.dataset.id, a));
    const active = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) active.add(entry.target.id);
        else active.delete(entry.target.id);
      });
      // Pick the first visible section in document order.
      const first = tocEntries.find((e) => active.has(e.id));
      linkById.forEach((link, id) => link.classList.toggle('active', first && id === first.id));
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    tocEntries.forEach((entry) => {
      const node = document.getElementById(entry.id);
      if (node) observer.observe(node);
    });
  }

  function initials(s) {
    return s.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase();
  }

  function buildHeroBolts() {
    const wrap = el('div', { className: 'hero-bolts' });
    const positions = [
      { x: '14%', y: '12%', size: 22, rot: 12 },
      { x: '38%', y: '6%',  size: 18, rot: -18 },
      { x: '62%', y: '18%', size: 26, rot: 8 },
      { x: '82%', y: '8%',  size: 20, rot: -10 },
      { x: '92%', y: '44%', size: 16, rot: 20 },
      { x: '72%', y: '70%', size: 24, rot: -12 },
      { x: '48%', y: '82%', size: 18, rot: 14 },
      { x: '22%', y: '66%', size: 20, rot: -16 },
      { x: '4%',  y: '46%', size: 22, rot: 10 }
    ];
    positions.forEach((p) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 32');
      svg.style.left = p.x;
      svg.style.top = p.y;
      svg.style.width = p.size + 'px';
      svg.style.height = (p.size * 1.3) + 'px';
      svg.style.transform = `rotate(${p.rot}deg)`;
      svg.innerHTML = '<path d="M14 0 L2 18 H11 L9 32 L22 12 H13 Z"/>';
      wrap.appendChild(svg);
    });
    return wrap;
  }

  function renderHeroHeadline(title) {
    // Split at the em-dash: brand name gets muted, rest of the title takes the
    // display weight with a final italic red accent word.
    const h1 = el('h1');
    const parts = title.split(/\s+—\s+/);
    if (parts.length >= 2) {
      const brand = el('span', { className: 'brand-name', text: parts[0] });
      h1.appendChild(brand);
      h1.appendChild(document.createTextNode(' '));
      const rest = parts.slice(1).join(' — ');
      // Wrap the last word of `rest` in italic red.
      const words = rest.split(' ');
      const last = words.pop();
      if (words.length) {
        h1.appendChild(document.createTextNode(words.join(' ') + ' '));
      }
      h1.appendChild(el('em', { text: last }));
    } else {
      h1.textContent = title;
    }
    return h1;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function renderUpdated(iso) {
    if (!iso) { updatedEl.textContent = 'Updated —'; return; }
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    updatedEl.textContent = `Updated ${relativeTime(diff)}`;
    updatedEl.title = d.toLocaleString();
    if (diff > 12 * 3600 * 1000) updatedEl.classList.add('stale');
  }

  function relativeTime(ms) {
    const min = Math.round(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.round(h / 24);
    return `${days}d ago`;
  }

  /* ------------- Prose ------------- */

  function renderProse(section) {
    const wrap = el('div');
    wrap.appendChild(sectionHeading(titleCase(section.title)));
    wrap.appendChild(el('p', { className: 'prose-body', text: section.body }));
    return wrap;
  }

  function titleCase(s) {
    return s
      .toLowerCase()
      .split(/(\s|—)/)
      .map((w) => (/^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
      .join('');
  }

  /* ------------- Approach ------------- */

  function renderApproachGrid(section) {
    const grid = el('div', { className: 'approach-grid' });
    section.bullets.forEach((b, idx) => {
      const card = el('div', { className: 'approach-card' });
      card.appendChild(el('span', { className: 'num', text: String(idx + 1).padStart(2, '0') }));
      card.appendChild(el('h3', { text: b.title }));
      card.appendChild(el('p', { text: b.body }));
      grid.appendChild(card);
    });
    return grid;
  }

  /* ------------- Clusters (tables + chart) ------------- */

  function buildChartLegend(clusters) {
    const legend = el('div', { className: 'chart-legend' });
    clusters.groups.forEach((g, idx) => {
      const color = cssVar(CLUSTER_COLORS[idx % CLUSTER_COLORS.length]);
      legend.appendChild(
        el('span', {
          children: [
            el('span', { className: 'ldot', attrs: { style: `background:${color}` } }),
            document.createTextNode(g.name)
          ]
        })
      );
    });
    return legend;
  }

  function initClustersChart(container, clusters) {
    const colors = CLUSTER_COLORS.map((v) => cssVar(v));
    const borderColor = 'rgba(255,255,255,0.08)';
    const tickColor = cssVar('--ink-3');
    const bgTooltip = cssVar('--bg-card');

    const series = clusters.groups.map((g, idx) => ({
      name: g.name,
      type: 'scatter',
      data: g.rows.map((r) => ({
        value: [r.kd, r.sv],
        name: r.keyword,
        display: { svDisplay: r.svDisplay, kd: r.kd, cpcDisplay: r.cpcDisplay }
      })),
      symbolSize: (val) => {
        const sv = val[1];
        // Area proportional to log(SV); clamp so tiny keywords are still visible.
        const s = Math.max(8, Math.min(44, 4 + Math.log10(Math.max(sv, 10)) * 5));
        return s;
      },
      itemStyle: {
        color: colors[idx % colors.length] + 'cc',
        borderColor: colors[idx % colors.length],
        borderWidth: 1
      }
    }));

    const chart = echarts.init(container, null, { renderer: 'canvas' });
    chart.setOption({
      animationDuration: 400,
      grid: { left: 56, right: 20, top: 8, bottom: 46 },
      xAxis: {
        name: 'Keyword Difficulty',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: tickColor, fontFamily: 'Inter', fontSize: 11, fontWeight: 500 },
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: borderColor, type: 'solid', width: 0.5 } },
        axisLabel: { color: tickColor, fontFamily: 'JetBrains Mono', fontSize: 11 }
      },
      yAxis: {
        name: 'Search Volume',
        nameLocation: 'middle',
        nameGap: 48,
        nameTextStyle: { color: tickColor, fontFamily: 'Inter', fontSize: 11, fontWeight: 500 },
        type: 'log',
        logBase: 10,
        min: 10,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: borderColor, type: 'solid', width: 0.5 } },
        axisLabel: {
          color: tickColor,
          fontFamily: 'JetBrains Mono',
          fontSize: 11,
          formatter: formatSv
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: bgTooltip,
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 0.5,
        textStyle: { color: cssVar('--ink-0'), fontFamily: 'Inter', fontSize: 13 },
        extraCssText: 'border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.5);padding:10px 14px;',
        formatter: (p) => {
          const d = p.data.display;
          return `
            <div style="font-weight:600;margin-bottom:5px;color:#fff;font-family:Inter">${escapeHtml(p.data.name)}</div>
            <div style="color:${cssVar('--ink-2')};font-family:'JetBrains Mono';font-size:11.5px">
              SV ${d.svDisplay} · KD ${d.kd} · CPC ${d.cpcDisplay || '—'}
            </div>`;
        }
      },
      series
    });

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
  }

  function formatSv(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(v);
  }

  function renderClusters(clusters) {
    const wrap = el('div', { className: 'clusters-tables' });
    clusters.groups.forEach((g) => {
      const table = el('div', { className: 'cluster-table' });
      table.appendChild(el('h3', { text: g.name }));
      const t = el('table');
      t.innerHTML = `
        <thead><tr>
          <th>Keyword</th>
          <th class="num">Volume</th>
          <th class="num">KD</th>
          <th class="num">CPC</th>
        </tr></thead>
        <tbody></tbody>`;
      const tbody = t.querySelector('tbody');
      g.rows
        .slice()
        .sort((a, b) => b.sv - a.sv)
        .forEach((r) => {
          const tr = el('tr');
          tr.innerHTML = `
            <td class="kw">${escapeHtml(r.keyword)}</td>
            <td class="num">${escapeHtml(r.svDisplay || '')}</td>
            <td class="num"><span class="kd-pill ${kdClass(r.kd)}">${r.kd || '—'}</span></td>
            <td class="num">${escapeHtml(r.cpcDisplay || '—')}</td>`;
          tbody.appendChild(tr);
        });
      table.appendChild(t);
      wrap.appendChild(table);
    });
    return wrap;
  }

  function kdClass(kd) {
    if (!kd) return '';
    if (kd < 40) return 'kd-low';
    if (kd < 75) return 'kd-med';
    return 'kd-high';
  }

  /* ------------- GEO Tracker matrix ------------- */

  function renderMatrix(geo) {
    const wrap = el('div', { className: 'matrix-wrap' });
    const scroll = el('div', { className: 'matrix-scroll' });
    const t = el('table', { className: 'matrix' });

    const topKeywords = geo.keywords.slice(0, KEYWORD_LIMIT);

    // Header
    const thead = el('thead');
    const trh = el('tr');
    trh.appendChild(el('th', { className: 'kw-col', text: 'Keyword / Prompt' }));
    trh.appendChild(el('th', { className: 'sv-col', text: 'SV' }));
    LEVER_GROUPS.forEach((group) => {
      trh.appendChild(el('th', {
        className: 'lever',
        text: group.label
      }));
    });
    thead.appendChild(trh);
    t.appendChild(thead);

    // Body
    const tbody = el('tbody');
    topKeywords.forEach((kw) => {
      const tr = el('tr');
      const kwCell = el('td', { className: 'kw-col' });
      kwCell.appendChild(el('span', { className: 'kw-name', text: kw.keyword }));
      tr.appendChild(kwCell);
      tr.appendChild(el('td', { className: 'sv-col', text: kw.svDisplay || '—' }));
      LEVER_GROUPS.forEach((group) => {
        const status = mergedStatus(kw.coverage, group.members);
        const td = el('td');
        td.appendChild(el('span', {
          className: `dot ${status}`,
          attrs: { title: `${group.label} — ${statusLabel(status)}` }
        }));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    scroll.appendChild(t);
    wrap.appendChild(scroll);

    // Legend
    const legend = el('div', { className: 'matrix-legend' });
    [
      ['done',       'Live'],
      ['inProgress', 'In Progress'],
      ['proposed',   'Planned'],
      ['notDone',    'Not Done']
    ].forEach(([k, label]) => {
      legend.appendChild(
        el('span', {
          className: 'leg',
          children: [
            el('span', { className: `dot ${k}` }),
            document.createTextNode(label)
          ]
        })
      );
    });
    legend.appendChild(
      el('span', {
        className: 'note',
        text: 'For each keyword we track every lever until your bases are covered across search + AI.'
      })
    );
    wrap.appendChild(legend);

    return wrap;
  }

  function statusLabel(s) {
    return { proposed: 'Planned', inProgress: 'In Progress', done: 'Live', notDone: 'Not Done' }[s] || s;
  }

  function mergedStatus(coverage, memberIds) {
    let best = 0;
    memberIds.forEach((id) => {
      const s = coverage[id] || 'notDone';
      const r = STATUS_RANK[s] ?? 0;
      if (r > best) best = r;
    });
    return RANK_STATUS[best];
  }

  /* ------------- Credits table ------------- */

  function renderCredits(credits) {
    const wrap = el('div', { className: 'credits-table' });
    const t = el('table');
    t.innerHTML = `
      <thead><tr>
        <th>Deliverable</th>
        <th style="text-align:right;width:100px">Credits</th>
        <th>What It Is</th>
      </tr></thead>
      <tbody></tbody>`;
    const tbody = t.querySelector('tbody');
    credits.rows.forEach((r) => {
      const tr = el('tr');
      tr.innerHTML = `
        <td class="deliv">${escapeHtml(r.deliverable)}</td>
        <td class="credits">${escapeHtml(r.credits)}</td>
        <td class="what">${escapeHtml(r.what)}</td>`;
      tbody.appendChild(tr);
    });
    wrap.appendChild(t);
    return wrap;
  }

  /* ------------- Month summaries ------------- */

  function renderMonthSummaries(section) {
    const wrap = el('div', { className: 'month-summaries' });
    section.months.forEach((m) => {
      const card = el('div', { className: 'month-summary' });
      card.appendChild(el('h3', { text: m.label }));
      const ul = el('ul');
      m.bullets.forEach((b) => ul.appendChild(el('li', { text: b })));
      card.appendChild(ul);
      wrap.appendChild(card);
    });
    return wrap;
  }

  /* ------------- Roadmap timeline ------------- */

  function renderRoadmap(roadmap) {
    const wrap = el('div', { className: 'timeline' });

    roadmap.months.forEach((month, idx) => {
      const phaseLabel = el('div', { className: 'phase-label' });
      phaseLabel.appendChild(el('span', { text: `Month ${idx + 1} — ${monthSubtitle(month.label)}` }));
      phaseLabel.appendChild(el('span', { className: 'phase-cost', text: `${month.totalCredits} credits` }));
      wrap.appendChild(phaseLabel);

      const phase = el('div', { className: 'phase' });
      const grouped = groupDeliverables(month.deliverables);
      grouped.forEach((g) => phase.appendChild(renderMilestone(g)));
      wrap.appendChild(phase);

      if (idx < roadmap.months.length - 1) wrap.appendChild(el('div', { className: 'phase-gap' }));
    });

    return wrap;
  }

  function monthSubtitle(label) {
    // "MONTH 1 — May 2026" → "May 2026"
    const m = /—\s*(.+)$/.exec(label || '');
    return m ? m[1] : '';
  }

  function groupDeliverables(deliverables) {
    const order = [];
    const map = new Map();
    deliverables.forEach((d) => {
      const key = d.type || 'Other';
      if (!map.has(key)) {
        order.push(key);
        map.set(key, { type: key, items: [], totalCredits: 0, description: d.description });
      }
      const group = map.get(key);
      group.items.push(d);
      group.totalCredits += d.credits || 0;
    });
    return order.map((k) => map.get(k));
  }

  function renderMilestone(group) {
    const ms = el('div', { className: 'ms' });
    const dotVar = TYPE_DOT_COLOR[group.type] || '--type-slate';
    const color = cssVar(dotVar);

    const dot = el('span', { className: 'ms-dot' });
    dot.style.background = color;
    dot.style.borderColor = color;
    ms.appendChild(dot);

    const count = group.items.length;
    const noun = count === 1 ? 'deliverable' : 'deliverables';

    // Meta line — count + colored credit badge
    const meta = el('div', { className: 'ms-meta' });
    meta.appendChild(el('span', { className: 'ms-meta-count', text: `${count} ${noun}` }));
    const badge = el('span', { className: 'ms-badge', text: `${group.totalCredits} credits` });
    badge.style.color = color;
    badge.style.background = hexWithAlpha(color, 0.14);
    badge.style.borderColor = hexWithAlpha(color, 0.35);
    meta.appendChild(badge);
    ms.appendChild(meta);

    // Title
    ms.appendChild(el('div', {
      className: 'ms-title',
      text: pluralizeType(group.type, count)
    }));

    // Body — use the description from any deliverable in the group
    const desc = group.items.find((d) => d.description)?.description;
    if (desc) ms.appendChild(el('div', { className: 'ms-body', text: desc }));

    // Keywords closer
    const keywords = group.items
      .map((d) => d.keyword)
      .filter((k, i, a) => k && a.indexOf(k) === i);
    if (keywords.length) {
      const deliver = el('div', { className: 'ms-deliver' });
      deliver.appendChild(el('span', { className: 'ms-deliver-label', text: 'Keywords: ' }));
      deliver.appendChild(document.createTextNode(keywords.join(' · ')));
      ms.appendChild(deliver);
    }

    return ms;
  }

  function hexWithAlpha(hex, alpha) {
    // Convert #rrggbb → rgba(r,g,b,alpha). Falls back to the input if not a hex string.
    const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function pluralizeType(type, count) {
    if (!type) return '';
    if (count <= 1) return type;
    // Naive pluralization of the last word.
    const parts = type.split(' ');
    const last = parts[parts.length - 1];
    if (/[^s]s$/.test(last) || /y$/.test(last)) {
      parts[parts.length - 1] = last.replace(/y$/, 'ies');
    } else if (!/s$/.test(last)) {
      parts[parts.length - 1] = last + 's';
    }
    return parts.join(' ');
  }

  /* ------------- Nav ------------- */

  function renderNav(section) {
    const wrap = el('div', { className: 'nav-grid' });
    section.items.forEach((it) => {
      const card = el('div', { className: 'nav-item' });
      card.appendChild(el('h4', { text: it.name }));
      if (it.description) card.appendChild(el('p', { text: it.description }));
      wrap.appendChild(card);
    });
    return wrap;
  }

  /* ------------- Footer ------------- */

  function renderFooter(text) {
    const f = el('div', { className: 'footer' });
    if (!text) return f;
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (emailMatch) {
      const before = text.slice(0, emailMatch.index).trim();
      f.appendChild(el('span', { text: before || 'Questions?' }));
      const a = el('a', { className: 'email-pill', text: emailMatch[0] });
      a.href = `mailto:${emailMatch[0]}`;
      f.appendChild(a);
    } else {
      f.appendChild(el('span', { text }));
    }
    return f;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
})();
