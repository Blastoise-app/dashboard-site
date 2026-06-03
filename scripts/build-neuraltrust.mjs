// Builds the NeuralTrust client fixture from structured source data.
//
// NeuralTrust's sheet ("NeuralTrust SEO Strategy & Roadmap") is laid out
// differently from the Ideogram template the generic gid-based parsers were fit
// to (different roadmap-with-status columns, stacked cluster tables, a KPI tab,
// no narrative Overview). The sheet is also shared-with-us, not public, so the
// unattended GitHub Action CSV fetch can't read it yet (that waits on a Google
// service account — see the plan's deferred "self-service foundation").
//
// So for v1 we transcribe the in-scope tabs here and emit the same StrategyDoc
// shape the app already renders. Re-run after editing:
//   node scripts/build-neuraltrust.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// ---- helpers -----------------------------------------------------------
function parseSv(s) {
  if (s == null) return 0;
  const t = String(s).replace(/,/g, "").trim();
  if (!t) return 0;
  const m = /^([\d.]+)\s*([KMkm])?$/.exec(t);
  if (!m) return parseFloat(t) || 0;
  const n = parseFloat(m[1]);
  const suf = (m[2] || "").toUpperCase();
  return n * (suf === "M" ? 1e6 : suf === "K" ? 1e3 : 1);
}
function normStatus(s) {
  const l = String(s || "").toLowerCase();
  if (l.includes("not done")) return "notDone";
  if (l.includes("proposed") || l.includes("ready")) return "proposed";
  if (
    l.includes("in progress") ||
    l.includes("started") ||
    l.includes("drafting") ||
    l.includes("reviewing")
  )
    return "inProgress";
  if (
    l.includes("done") ||
    l.includes("complete") ||
    l.includes("live") ||
    l.includes("published")
  )
    return "done";
  return "notDone";
}
const svDisp = (n) => (n ? Number(n).toLocaleString("en-US") : "");

// ---- GeoTracker: 9 levers (3 SEO + 6 GEO) ------------------------------
const LEVERS = [
  { id: "page", label: "Page", group: "SEO" },
  { id: "listicle", label: "Listicle", group: "SEO" },
  { id: "backlinks", label: "Backlinks", group: "SEO" },
  { id: "guestPostListicle", label: "Guest Post Listicle", group: "GEO" },
  { id: "listicleInclusion", label: "Listicle Inclusion", group: "GEO" },
  { id: "redditSerp", label: "Reddit Thread on SERP", group: "GEO" },
  { id: "redditLlms", label: "Reddit Thread influencing LLMs", group: "GEO" },
  { id: "linkedinPulse", label: "LinkedIn Pulse Article", group: "GEO" },
  { id: "wikipedia", label: "Wikipedia", group: "GEO" },
];
// [keyword, sv, proposedLeverIds[]] — everything else defaults to notDone.
const GEO = [
  ["agentic ai security software", 90, ["listicle", "guestPostListicle"]],
  ["ai governance tools", 2800, ["listicle", "backlinks"]],
  ["AI security companies", 990, ["listicle"]],
  ["ai cybersecurity tools", 730, ["listicle"]],
  ["ai security software", 590, ["page", "listicle", "backlinks"]],
  ["ai safety software", 100, ["listicle"]],
  ["ai gateway software", 10, []],
  ["AI firewall software", 1900, []],
  ["AI data security platform", 310, []],
  ["red teaming tools", 680, []],
  ["ai compliance solution", 1600, []],
  ["ai observability tools", 590, []],
  ["ai monitoring tools", 540, []],
  ["ai risk management software", 420, []],
  ["data masking tool", 940, []],
  ["threat detection tools", 700, []],
  ["bot detection software", 380, []],
  ["holistic alternatives", 510, []],
  ["varonis alternatives", 200, []],
  ["zenity alternatives", 120, []],
];
const geoTracker = {
  levers: LEVERS.map(({ id, label, group }) => ({ id, label, group })),
  keywords: GEO.map(([keyword, sv, proposed]) => {
    const coverage = {};
    for (const l of LEVERS) coverage[l.id] = proposed.includes(l.id) ? "proposed" : "notDone";
    return { keyword, svDisplay: svDisp(sv), sv, coverage };
  }),
};

// ---- Clusters: stacked tables (Keyword / SV / KD, no CPC) ---------------
const CLUSTERS = [
  ["AI Compliance", [
    ["ai compliance solution", "1,600", 50],
    ["ai compliance software", "870", 59],
    ["ai compliance tools", "590", 26],
    ["AI compliance solutions", "370", 64],
    ["ai compliance platform", "160", 60],
    ["ai safety platforms for compliance", "140", 16],
  ]],
  ["Competitor Alternatives", [
    ["holistic alternatives", "510", 58],
    ["varonis alternatives", "200", 0],
    ["zenity alternatives", "120", 0],
    ["alice alternative", "30", 0],
    ["apiiro alternatives", "10", 0],
  ]],
  ["Core — AI Security & Governance", [
    ["AI security", "13,200", 65],
    ["AI governance", "11,800", 67],
    ["AI cybersecurity", "11,000", 77],
    ["AI safety", "4,000", 61],
    ["AI gateway", "3,100", 48],
    ["ai governance tools", "2,800", 21],
    ["ai governance platform", "1,800", 34],
    ["ai governance software", "1,400", 36],
    ["AI red teaming", "1,200", 36],
    ["AI security companies", "990", 57],
    ["ai cybersecurity tools", "730", 49],
    ["AI agent security", "630", 29],
    ["ai security software", "590", 59],
    ["ai observability tools", "590", 33],
    ["ai monitoring tools", "540", 46],
    ["AI security platform", "430", 69],
    ["ai governance tool", "420", 25],
    ["ai risk management software", "420", 32],
    ["llm security tools", "380", 19],
    ["ai visibility software", "380", 36],
    ["llm observability tools", "360", 16],
    ["AI data security platform", "310", 61],
    ["ai cybersecurity software", "210", 55],
    ["best llm observability tools", "150", 15],
    ["ai security tool", "140", 64],
    ["ai safety software", "100", 31],
    ["ai trism solution", "90", 30],
    ["ai trism tools", "80", 20],
    ["enterprise AI governance platform", "20", 0],
    ["ai gateway software", "10", 30],
  ]],
  ["Firewall & Data Security", [
    ["AI firewall software", "1,900", 63],
    ["data masking tool", "940", 22],
    ["data masking software", "820", 27],
    ["bot detection software", "380", 27],
    ["bot detection tools", "260", 28],
    ["best data masking software", "90", 20],
  ]],
  ["Threat Detection & Red Teaming", [
    ["threat detection tools", "700", 30],
    ["red teaming tools", "680", 21],
    ["ai red teaming tools", "230", 15],
    ["threat detection platform", "150", 51],
    ["ai discovery response software", "70", 0],
    ["shadow ai discovery", "50", 0],
  ]],
];
const clusters = {
  groups: CLUSTERS.map(([name, rows]) => ({
    name,
    rows: rows.map(([keyword, svStr, kd]) => ({
      keyword,
      svDisplay: svStr,
      sv: parseSv(svStr),
      kd,
    })),
  })),
};

// ---- Roadmap (status): live Monthly Reporting / Bi-Weekly deck ----------
// Ordered Month 1→3 (the sheet lists them July/May/June).
const ROADMAP = [
  ["MONTH 1 — May 2026", [
    [2, "New Blog", "ai security companies and vendors", "https://docs.google.com/document/d/1gVFbYrBifHAhOkZjh5jq6GDu7QuS69NmtGb3DdD3-MA/edit", "990", "", "Client Reviewing Draft", "5/11", "priority kwd, start building up kywds around ai security in month 1, high search volume, moderate KD but will support with backlinks once it goes live"],
    [2, "New Blog", "ai governance tools", "https://docs.google.com/document/d/1_UjIJ0geyNx_HcyaTJkWNUJhMv178ajGG0MNsZe4qqk/edit", "2800", "", "Drafting in Progress", "5/11", "priority kywd for the client, very high search volume, easy KD; prioritizing listicle for month 1 both for SERP traffic benefit + AI citations/mention"],
    [1, "Page Refresh", "agentic ai security software", "https://docs.google.com/document/d/1Uq66ky66bpmalxGZo1HJXKKfRd3VgS6tYNAqvMi9PUQ/edit", "590", "https://neuraltrust.ai/ai-agent-security", "Drafting in Progress", "5/6", "top priority page for client; currently driving no traffic/not ranking for keywords with SV, recommending high intent product page as priority for month 1; optimize for \"ai security software\" but layer in \"ai agent security software\" as a secondary kywd throughout"],
    [1, "Backlink", "ai governance tools", "", "2800", "https://neuraltrust.ai/", "Link in Progress", "5/11", "backlinks essential for building authority signals with Google; recommending high sv prio kywd to the homepage"],
    [1, "Backlink", "ai security software", "", "590", "https://neuraltrust.ai/", "Link in Progress", "5/11", "backlink for high prio keyword to the homepage"],
    [null, "Project", "Manual outreach campaign for listicle inclusion running", "", "", "", "Link in Progress", "5/11", ""],
  ]],
  ["MONTH 2 — June 2026", [
    [2, "New Blog", "ai cybersecurity tools", "https://docs.google.com/document/d/1QYOKIqYDjxrmHbguwkiWfLNgL2SRX4OH0yBM9hyU6-w/edit", "730", "", "Client Reviewing Outline", "5/6", "prio kywd; good search volume, prioritize onsite listicle to build up onsite foundation for SERP + AI search"],
    [2, "New Blog", "ai security software and tools", "https://docs.google.com/document/d/1-FYuSw2VtlgqV86faXEkFaOxGK-0zJpNt6m9q_M3TEw/edit", "590", "", "Client Reviewing Outline", "5/6", "serp is different for this vs ai security companies, so recommending a separate listicle to capture search for this high intent kywd"],
    [1, "Page Refresh", "ai firewall software", "https://docs.google.com/document/d/1lrYoZbNJw_mTSBAVRUtOptajyn4cIQyHJPfaq2dPA_I/edit", "1900", "https://neuraltrust.ai/generative-application-firewall", "Client Reviewing Outline", "5/6", "a top priority page for the client, approved to optimize for AI firewall software, very good SV, more competitive so need to prioritize backlinks to this page"],
    [1, "Backlink", "agentic ai security software", "", "590", "https://neuraltrust.ai/ai-agent-security", "Ready to Start", "5/6", "backlink to newly refreshed page"],
    [1, "Backlink", "ai security companies", "", "990", "https://neuraltrust.ai/", "Ready to Start", "5/6", "backlink to homepage for high SV, high intent kywd"],
    [null, "Project", "Manual outreach campaign for listicle inclusion running", "", "", "", "Ready to Start", "5/6", ""],
  ]],
  ["MONTH 3 — July 2026", [
    [2, "New Blog", "agentic AI security solutions", "", "90", "", "Ready to Start", "5/6", "ai agent security software secondary kyword/include throughout the article when talking about the client"],
    [1, "New Blog", "ai safety software", "", "100", "", "Ready to Start", "5/6", "prio keyword for the client; serp is different than the previous kywds so it makes sense to do a separate article for this; pushing to month 3 because still want to prio this kywd but lower sv than the other priority keywords"],
    [2, "Guest Post Listicle", "agentic AI security solutions", "", "90", "", "Ready to Start", "5/6", "start layering in offsite content; prioritizing agentic AI security kywd, as this is a top priority for the client to get ahead in"],
    [1, "Backlink", "ai security companies: link to new blog from month 1", "", "990", "", "Ready to Start", "5/6", "prioritizing backlinks to new content to boost authority"],
    [1, "Backlink", "ai governance tools: link to new blog from month 1", "", "", "", "Ready to Start", "5/6", "prioritizing backlinks to new content to boost authority"],
    [null, "Project", "Manual outreach campaign for listicle inclusion running", "", "", "", "Ready to Start", "5/6", ""],
    [null, "Project", "circle back on Wikipedia project", "", "", "", "Ready to Start", "", ""],
  ]],
];
const roadmap = {
  intro:
    "Live publishing roadmap across the first three months — every deliverable with its current production status and supporting docs.",
  months: ROADMAP.map(([label, dels]) => ({
    label,
    totalCredits: dels.reduce((sum, d) => sum + (d[0] || 0), 0),
    deliverables: dels.map(([credits, type, keyword, docLink, sv, existingLink, statusRaw, asOf, why]) => ({
      credits: credits || 0,
      type,
      keyword,
      title: keyword,
      rationale: "",
      description: why,
      searchVolume: sv ? svDisp(parseSv(sv)) : "",
      status: normStatus(statusRaw),
      statusRaw,
      docLink: docLink || undefined,
      existingLink: existingLink || undefined,
      asOf: asOf || undefined,
    })),
  })),
};

// ---- KPI tracker → temporary "Reporting" view ---------------------------
const kpi = {
  objectives: [
    ["Support Organic Revenue Growth", "Visibility", "SEO: Target keywords on page 1 of Google", "0", "April 2026", "Semrush / GSC"],
    ["", "Visibility", "GEO: Share of Voice", "1.80%", "April 2026", "Athena"],
    ["", "Visibility", "GEO: Mention Rate", "2%", "April 2026", "Athena"],
    ["", "Visibility", "GEO: Citation Rate", "0.60%", "April 2026", "Athena"],
    ["", "Traffic", "SEO: Google organic traffic", "~4K/month", "Average Q1 2026", "GSC"],
    ["", "Traffic", "GEO: Referral traffic from AI platforms", "91", "Sessions April 2026", "GA4"],
    ["", "Traffic", "GEO: Branded organic traffic", "~770 average", "Average Jan–April 2026", "GSC"],
    ["", "Traffic", "GEO: Direct traffic in GA4", "~1.2k average", "Average Jan–April 2026", "GA4"],
    ["", "Conversions + Revenue", "HDYHAU survey — AI models", "", "", ""],
    ["", "Conversions + Revenue", "Book a Demo driven from SEO + GEO", "", "", ""],
    ["", "Conversions + Revenue", "Pipeline driven from SEO + GEO", "", "", ""],
  ].map(([objective, funnel, kpiName, baseline, date, tool]) => ({
    objective,
    funnel,
    kpi: kpiName,
    baseline,
    date,
    tool,
  })),
  targets: [
    ["Mentions (AI search)", "Your share of mentions in relevant responses", "2%", "5%", "15%", "20%", "goal to outpace current competitor mention %"],
    ["Share of Voice (AI search)", "How often AI mentions your brand vs competitors", "1.8%", "3%", "13%", "16%", "goal to get NeuralTrust in current top 3"],
    ["Organic Traffic", "Organic traffic (clicks) going to your website", "4.5K/month", "7,000 (+55%)", "10,000 (+43%)", "15,000 (+50%)", "Aggressive content strategy required to significantly surpass competitors; high intent/traffic driving content"],
  ].map(([kpiName, description, baseline, m3, m6, m12, notes]) => ({
    kpi: kpiName,
    description,
    baseline,
    m3,
    m6,
    m12,
    notes,
  })),
};

// ---- Assemble + write ---------------------------------------------------
const doc = {
  slug: "neuraltrust",
  title: "NeuralTrust — AI Security SEO & GEO Strategy",
  subtitle: "Search Everywhere Optimization Roadmap · Prepared by Growth Marketing Pro",
  brand: { name: "Growth Marketing Pro", chipBg: "#151D29" },
  lastUpdated: "2026-05-13",
  clusters,
  geoTracker,
  roadmap,
  kpi,
};

const fixturePath = resolve(repoRoot, "web/src/fixtures/neuraltrust.json");
const docsPath = resolve(repoRoot, "docs/neuraltrust/data.json");
writeFileSync(fixturePath, JSON.stringify(doc, null, 2) + "\n");
mkdirSync(resolve(repoRoot, "docs/neuraltrust"), { recursive: true });
writeFileSync(docsPath, JSON.stringify(doc, null, 2) + "\n");
console.log(
  `Wrote ${doc.geoTracker.keywords.length} geo keywords, ` +
    `${doc.clusters.groups.reduce((n, g) => n + g.rows.length, 0)} cluster rows, ` +
    `${doc.roadmap.months.reduce((n, m) => n + m.deliverables.length, 0)} roadmap deliverables, ` +
    `${doc.kpi.objectives.length} KPI objectives, ${doc.kpi.targets.length} KPI targets`,
);
console.log(`→ ${fixturePath}`);
console.log(`→ ${docsPath}`);
