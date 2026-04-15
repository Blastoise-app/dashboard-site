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
  heroContent.appendChild(renderHeroHeadline(data.title));
  heroContent.appendChild(el('p', { className: 'subtitle', text: data.subtitle }));
  hero.appendChild(heroContent);
  app.appendChild(hero);

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
    // Split at the em-dash so the first half becomes a red accent.
    const h1 = el('h1');
    const parts = title.split(/\s+—\s+/);
    if (parts.length >= 2) {
      h1.appendChild(el('span', { className: 'accent', text: parts[0] + ' — ' }));
      h1.appendChild(document.createTextNode(parts.slice(1).join(' — ')));
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

  const CLUSTER_COLORS = ['--red', '--type-blue', '--type-purple'];

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
    const borderColor = 'rgba(255,255,255,0.1)';
    const tickColor = cssVar('--text-tertiary');
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
        backgroundColor: bgTooltip,
        borderColor: borderColor,
        borderWidth: 0.5,
        textStyle: { color: cssVar('--text-primary'), fontFamily: 'DM Sans', fontSize: 13 },
        extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.4);',
        formatter: (p) => {
          const d = p.data.display;
          return `
            <div style="font-weight:600;margin-bottom:4px;color:#fff">${escapeHtml(p.data.name)}</div>
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

  const LEVER_SHORT = {
    'Product Page': 'Product Page',
    'Onsite Listicle': 'Listicle',
    'Backlink': 'Backlink',
    'Reddit Thread on SERP': 'Reddit SERP',
    'Brand Endorsing Comment': 'Reddit Comments',
    'Link + Subreddit': 'Reddit Link',
    'Guest Post Listicle': 'Guest Post',
    'Guest Post Listicle 2': 'Guest Post 2',
    'Listicle Inclusion': 'Listicle Inclusion',
    'Reddit Thread (LLM)': 'Reddit LLM',
    'Brand Endorsing Comment (LLM)': 'Comments LLM',
    'Link + Subreddit (LLM)': 'Link LLM',
    'LinkedIn Pulse Article': 'LinkedIn',
    'Schema Markup': 'Schema'
  };

  function renderMatrix(geo) {
    const wrap = el('div', { className: 'matrix-wrap' });
    const scroll = el('div', { className: 'matrix-scroll' });
    const t = el('table', { className: 'matrix' });

    // Header
    const thead = el('thead');
    const trh = el('tr');
    trh.appendChild(el('th', { className: 'kw-col', text: 'Keyword / Prompt' }));
    trh.appendChild(el('th', { className: 'sv-col', text: 'SV' }));
    const seoLastIdx = geo.levers.findLastIndex((l) => l.group === 'SEO');
    geo.levers.forEach((lever, idx) => {
      const short = LEVER_SHORT[lever.label] || lever.label;
      const th = el('th', {
        className: 'lever' + (idx === seoLastIdx ? ' seo-last' : ''),
        text: short,
        attrs: { title: lever.label }
      });
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
      tr.appendChild(kwCell);
      tr.appendChild(el('td', { className: 'sv-col', text: kw.svDisplay || '—' }));
      geo.levers.forEach((lever, idx) => {
        const status = kw.coverage[lever.id] || 'notDone';
        const td = el('td', { className: idx === seoLastIdx ? 'seo-last' : '' });
        td.appendChild(el('span', {
          className: `dot ${status}`,
          attrs: { title: `${lever.label} — ${statusLabel(status)}` }
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
    roadmap.months.forEach((month, idx) => {
      const col = el('div', { className: 'month-col' });
      const card = el('div', { className: 'month-card' });
      const head = el('div', { className: 'month-head', text: `Month ${idx + 1}` });
      card.appendChild(head);
      const rows = el('div', { className: 'month-rows' });
      month.deliverables.forEach((d) => rows.appendChild(renderDeliverableRow(d)));
      card.appendChild(rows);
      col.appendChild(card);
      col.appendChild(el('div', { className: 'month-total', text: `${month.totalCredits} credits` }));
      wrap.appendChild(col);
    });
    return wrap;
  }

  function renderDeliverableRow(d) {
    const row = el('div', { className: 'deliv-row' });
    const typeClass = typeToClass(d.type);
    row.appendChild(el('span', { className: `type-chip ${typeClass}`, text: shortenType(d.type) }));
    const titleText = d.keyword
      ? `${arrowIf(d)}${d.keyword}`
      : (d.title || d.type);
    row.appendChild(el('span', { className: 'deliv-title', text: titleText, attrs: { title: d.title || d.keyword } }));
    row.appendChild(el('span', { className: 'credit-num', text: String(d.credits) }));

    const extra = el('div', { className: 'extra' });
    if (d.title) extra.appendChild(el('div', { html: `<strong>${escapeHtml(d.title)}</strong>` }));
    if (d.rationale) extra.appendChild(el('div', { text: d.rationale, attrs: { style: 'margin-top:4px' } }));
    if (d.description) extra.appendChild(el('div', { text: d.description, attrs: { style: 'margin-top:4px;color:var(--text-tertiary)' } }));
    row.appendChild(extra);

    row.addEventListener('click', () => row.classList.toggle('open'));
    return row;
  }

  function arrowIf(d) {
    // When the title is a "refresh" / "outreach" type, prefix with arrow to indicate action on existing.
    if (/refresh|outreach|optim/i.test(d.type)) return '→ ';
    return '';
  }

  function typeToClass(type) {
    const clean = (type || '').replace(/\([^)]*\)/g, '').replace(/[^A-Za-z]/g, '').trim();
    return clean ? `type-${clean}` : 'type-default';
  }

  function shortenType(type) {
    if (!type) return '';
    return type
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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
