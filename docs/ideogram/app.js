(async function () {
  const app = document.getElementById('app');
  const updatedEl = document.getElementById('updated');
  const brandLogo = document.getElementById('brandLogo');
  const brandTitle = document.getElementById('brandTitle');

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
    brandLogo.textContent = initials(data.brand.name);
    if (data.brand.chipBg) brandLogo.style.background = data.brand.chipBg;
  }
  renderUpdated(data.lastUpdated);

  app.classList.remove('loading');
  app.textContent = '';

  // Hero
  app.appendChild(el('h1', { text: data.title }));
  app.appendChild(el('p', { className: 'subtitle', text: data.subtitle }));

  const sections = data.overview?.sections || [];
  const byKind = (kind) => sections.find((s) => s.kind === kind);
  const byTitle = (re) => sections.find((s) => re.test(s.title));

  // THE OPPORTUNITY
  const opportunity = byTitle(/THE OPPORTUNITY/i);
  if (opportunity) app.appendChild(renderProse(opportunity));

  // OUR APPROACH
  const approach = sections.find((s) => s.kind === 'approach');
  if (approach) app.appendChild(renderApproach(approach));

  // Visualization 1: Keyword universe scatter
  if (data.clusters?.groups?.length) {
    app.appendChild(sectionHeading('Keyword Universe'));
    app.appendChild(el('p', {
      className: 'section-intro',
      text: 'Every buyer keyword across the image, logo, and creative clusters — plotted by difficulty vs. search volume. Bigger, lower-left is easier to rank with bigger payoff.'
    }));
    const chartWrap = el('div', { className: 'chart-wrap' });
    chartWrap.appendChild(buildChartLegend(data.clusters));
    const chartDiv = el('div', { id: 'clustersChart' });
    chartWrap.appendChild(chartDiv);
    app.appendChild(chartWrap);

    // Defer chart init until after layout
    requestAnimationFrame(() => initClustersChart(chartDiv, data.clusters));
  }

  // Clusters tables
  if (data.clusters?.groups?.length) {
    app.appendChild(sectionHeading('Clusters'));
    app.appendChild(el('p', {
      className: 'section-intro',
      text: 'Full keyword universe, sortable by search volume, difficulty, and CPC. Colored KD pills flag keywords by how hard they are to rank.'
    }));
    app.appendChild(renderClusters(data.clusters));
  }

  // STRATEGIC ALLOCATION
  const strategic = byTitle(/STRATEGIC ALLOCATION/i);
  if (strategic) app.appendChild(renderProse(strategic));

  // Visualization 2: GEO Tracker matrix
  if (data.geoTracker?.keywords?.length) {
    app.appendChild(sectionHeading('GEO Tracker — Coverage Matrix'));
    app.appendChild(el('p', {
      className: 'section-intro',
      text: 'Every priority keyword × every SEO and GEO lever. Each cell shows whether we plan to activate that surface for that keyword — the at-a-glance picture of where Ideogram will show up.'
    }));
    app.appendChild(renderMatrix(data.geoTracker));
  }

  // HOW THE CREDIT SYSTEM
  const credits = byKind('creditSystem');
  if (credits) {
    app.appendChild(sectionHeading('How The Credit System Works'));
    if (credits.intro) app.appendChild(el('p', { className: 'section-intro', text: credits.intro }));
    app.appendChild(renderCredits(credits));
  }

  // MONTH-BY-MONTH SUMMARY
  const monthSummaries = byKind('monthSummaries');
  if (monthSummaries) {
    app.appendChild(sectionHeading('Month-by-Month Summary'));
    app.appendChild(renderMonthSummaries(monthSummaries));
  }

  // Visualization 3: 3-Month Roadmap
  if (data.roadmap?.months?.length) {
    app.appendChild(sectionHeading('3-Month Roadmap'));
    app.appendChild(el('p', {
      className: 'section-intro',
      text: 'Every deliverable, month by month. Tap a card to see what it is and why it matters.'
    }));
    app.appendChild(renderRoadmap(data.roadmap));
  }

  // HOW TO NAVIGATE
  const nav = byKind('navigation');
  if (nav && nav.items.length) {
    app.appendChild(sectionHeading('How to Navigate This Document'));
    app.appendChild(renderNav(nav));
  }

  // Footer
  app.appendChild(renderFooter(data.overview?.footer || ''));

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

  function sectionHeading(text) {
    return el('h2', { text });
  }

  function initials(s) {
    return s.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join('').toUpperCase();
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

  function renderApproach(section) {
    const wrap = el('div');
    wrap.appendChild(sectionHeading('Our Approach — Search Everywhere Optimization'));
    if (section.intro) wrap.appendChild(el('p', { className: 'section-intro', text: section.intro }));
    const grid = el('div', { className: 'approach-grid' });
    for (const b of section.bullets) {
      grid.appendChild(
        el('div', {
          className: 'approach-card',
          children: [
            el('h3', { text: b.title }),
            el('p', { text: b.body })
          ]
        })
      );
    }
    wrap.appendChild(grid);
    return wrap;
  }

  /* ------------- Clusters (tables + chart) ------------- */

  const CLUSTER_COLORS = ['--blue-text', '--purple-text', '--green-text'];

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
    const borderColor = cssVar('--border');
    const tickColor = cssVar('--text-tertiary');
    const bgPrimary = cssVar('--bg-primary');

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
        nameGap: 28,
        nameTextStyle: { color: tickColor, fontFamily: 'DM Sans', fontSize: 11 },
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: borderColor, type: 'solid', width: 0.5 } },
        axisLabel: { color: tickColor, fontFamily: 'DM Mono', fontSize: 11 }
      },
      yAxis: {
        name: 'Search Volume',
        nameLocation: 'middle',
        nameGap: 44,
        nameTextStyle: { color: tickColor, fontFamily: 'DM Sans', fontSize: 11 },
        type: 'log',
        logBase: 10,
        min: 10,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: borderColor, type: 'solid', width: 0.5 } },
        axisLabel: {
          color: tickColor,
          fontFamily: 'DM Mono',
          fontSize: 11,
          formatter: formatSv
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: bgPrimary,
        borderColor: borderColor,
        borderWidth: 0.5,
        textStyle: { color: cssVar('--text-primary'), fontFamily: 'DM Sans', fontSize: 13 },
        extraCssText: 'border-radius:10px;box-shadow:none;',
        formatter: (p) => {
          const d = p.data.display;
          return `
            <div style="font-weight:600;margin-bottom:4px">${escapeHtml(p.data.name)}</div>
            <div style="color:${cssVar('--text-secondary')};font-family:DM Mono;font-size:11.5px">
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

    // Header
    const thead = el('thead');
    const trh = el('tr');
    trh.appendChild(el('th', { className: 'kw-col', text: 'Keyword' }));
    const seoLastIdx = geo.levers.findLastIndex((l) => l.group === 'SEO');
    geo.levers.forEach((lever, idx) => {
      const th = el('th', { className: 'lever' + (idx === seoLastIdx ? ' seo-last' : '') });
      th.appendChild(el('span', { className: 'lever-header', text: lever.label }));
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    t.appendChild(thead);

    // Body
    const tbody = el('tbody');
    geo.keywords.forEach((kw) => {
      const tr = el('tr');
      const kwCell = el('td', { className: 'kw-col' });
      kwCell.appendChild(el('span', { className: 'kw-name', text: kw.keyword }));
      kwCell.appendChild(el('span', { className: 'kw-sv', text: `SV ${kw.svDisplay || '—'}` }));
      tr.appendChild(kwCell);
      geo.levers.forEach((lever, idx) => {
        const status = kw.coverage[lever.id] || 'notDone';
        const td = el('td', { className: idx === seoLastIdx ? 'seo-last' : '' });
        td.appendChild(el('span', { className: `cell-chip ${status}`, attrs: { title: `${lever.label} — ${statusLabel(status)}` } }));
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
      ['proposed',   'Proposed'],
      ['inProgress', 'In Progress'],
      ['done',       'Done'],
      ['notDone',    'Not in scope']
    ].forEach(([k, label]) => {
      legend.appendChild(
        el('span', {
          children: [
            el('span', { className: `cell-chip ${k}` }),
            document.createTextNode(label)
          ]
        })
      );
    });
    wrap.appendChild(legend);

    return wrap;
  }

  function statusLabel(s) {
    return { proposed: 'Proposed', inProgress: 'In Progress', done: 'Done', notDone: 'Not in scope' }[s] || s;
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
    const wrap = el('div', { className: 'roadmap' });
    roadmap.months.forEach((month) => {
      const col = el('div', { className: 'month-col' });
      const head = el('div', { className: 'month-head' });
      head.appendChild(el('h3', { text: month.label }));
      head.appendChild(el('span', { className: 'month-total', text: `${month.totalCredits} credits` }));
      col.appendChild(head);
      const body = el('div', { className: 'month-body' });
      month.deliverables.forEach((d) => body.appendChild(renderDeliverable(d)));
      col.appendChild(body);
      wrap.appendChild(col);
    });
    return wrap;
  }

  function renderDeliverable(d) {
    const card = el('div', { className: 'deliverable' });
    const head = el('div', { className: 'deliverable-head' });
    head.appendChild(el('span', { className: 'type-chip', text: d.type }));
    head.appendChild(el('span', { className: 'credit-badge', text: `${d.credits} cr` }));
    card.appendChild(head);
    card.appendChild(el('h4', { text: d.title }));
    if (d.keyword) card.appendChild(el('span', { className: 'kw-chip', text: d.keyword }));
    if (d.rationale) card.appendChild(el('div', { className: 'rationale', text: d.rationale }));
    if (d.description) card.appendChild(el('div', { className: 'description', text: d.description }));
    card.addEventListener('click', () => card.classList.toggle('open'));
    return card;
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
