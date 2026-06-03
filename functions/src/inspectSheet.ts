// READ-ONLY sheet inspector. Answers: "does this workbook have formulas /
// filters / named ranges / conditional formatting that adding a far-right
// _rowId column could disturb?" It NEVER writes — it authenticates with the
// spreadsheets.readonly scope, so a write is physically impossible.
//
// Run (keyless, impersonating the ingest SA — same auth as devSync):
//   gcloud auth application-default login \
//     --impersonate-service-account=sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com
//   npx tsx functions/src/inspectSheet.ts [spreadsheetId]
import { sheets, type sheets_v4 } from "@googleapis/sheets";
import { GoogleAuth, OAuth2Client, Impersonated } from "google-auth-library";

const READONLY = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const INGEST_SA =
  process.env.INGEST_SA_EMAIL ??
  "sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com";
const DEFAULT_SHEET = "1Ye47tP_PXUNQz-3m-nY_08dvBF3cCI6ilZ7C-dDqJ3o";

// The one tab the sync writes a _rowId column into. The roadmap is read-only (a
// live IMPORTRANGE mirror — see project notes); everything else we only read.
const WRITE_TABS = new Set(["GEO Tracker"]);

async function api(): Promise<sheets_v4.Sheets> {
  const token = process.env.SHEETS_ACCESS_TOKEN;
  if (token) {
    const oauth = new OAuth2Client();
    oauth.setCredentials({ access_token: token });
    return sheets({ version: "v4", auth: oauth });
  }
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const source = await auth.getClient();
  const impersonated = new Impersonated({
    sourceClient: source as never,
    targetPrincipal: INGEST_SA,
    targetScopes: READONLY,
    lifetime: 3600,
  });
  return sheets({ version: "v4", auth: impersonated as never });
}

function colToA1(n: number): string {
  let s = "";
  let x = n + 1;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

// Render a GridRange to a readable A1 range (open-ended sides shown as "∞").
function rangeA1(r?: sheets_v4.Schema$GridRange): string {
  if (!r) return "(whole sheet)";
  const c1 = r.startColumnIndex != null ? colToA1(r.startColumnIndex) : "A";
  const c2 = r.endColumnIndex != null ? colToA1(r.endColumnIndex - 1) : "∞→";
  const r1 = r.startRowIndex != null ? r.startRowIndex + 1 : 1;
  const r2 = r.endRowIndex != null ? r.endRowIndex : "∞↓";
  return `${c1}${r1}:${c2}${r2}`;
}

// A column index past the last data column => an appended _rowId column would
// land at or before this filter/range's right edge, so it'd be "noticed".
function openToRight(r?: sheets_v4.Schema$GridRange): boolean {
  return !!r && r.endColumnIndex == null;
}

async function main() {
  const spreadsheetId = process.argv.slice(2).find((a) => !a.startsWith("--")) || DEFAULT_SHEET;
  const client = await api();
  const res = await client.spreadsheets.get({
    spreadsheetId,
    includeGridData: true,
    fields:
      "properties.title,namedRanges," +
      "sheets.properties(sheetId,title,index,gridProperties)," +
      "sheets.basicFilter,sheets.filterViews(title,range)," +
      "sheets.protectedRanges(range,description,warningOnly,editors)," +
      "sheets.conditionalFormats.ranges,sheets.bandedRanges.range," +
      "sheets.merges,sheets.charts(chartId,spec.title)," +
      "sheets.data(startRow,startColumn,rowData.values(userEnteredValue,dataValidation.condition.type))",
  });
  const data = res.data;

  // Second pass: the RENDERED grid (FORMATTED_VALUE) — this is what ensureRowIds
  // reads to compute `width`. It includes spill output from IMPORTRANGE/ARRAYFORMULA
  // that the userEnteredValue pass below cannot see (spilled cells have no
  // userEnteredValue). Comparing the two reveals "this tab is a live mirror".
  const titles = (data.sheets ?? []).map((s) => s.properties?.title ?? "").filter(Boolean);
  const rendered = new Map<string, { rows: number; cols: number }>();
  if (titles.length) {
    const bg = await client.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: titles.map((t) => `'${t.replace(/'/g, "''")}'`),
      valueRenderOption: "FORMATTED_VALUE",
    });
    (bg.data.valueRanges ?? []).forEach((vr, i) => {
      const grid = (vr.values ?? []) as string[][];
      const rows = grid.length;
      const cols = grid.reduce((w, r) => Math.max(w, r.length), 0);
      rendered.set(titles[i], { rows, cols });
    });
  }

  console.log(`\nWorkbook: ${data.properties?.title}`);
  console.log(`  id: ${spreadsheetId}\n`);

  const named = data.namedRanges ?? [];
  console.log(`Named ranges (workbook-level): ${named.length}`);
  named.forEach((n) => console.log(`  • ${n.name}  → ${rangeA1(n.range)} (sheetId ${n.range?.sheetId})`));
  console.log("");

  for (const sh of data.sheets ?? []) {
    const p = sh.properties;
    const title = p?.title ?? "(untitled)";
    const gp = p?.gridProperties;
    const writes = WRITE_TABS.has(title);
    console.log(`──────────────────────────────────────────────────────`);
    console.log(`TAB: ${title}${writes ? "   ⟵ sync writes _rowId here" : ""}`);
    console.log(
      `  grid: ${gp?.rowCount} rows × ${gp?.columnCount} cols  ` +
        `frozen: ${gp?.frozenRowCount ?? 0} row / ${gp?.frozenColumnCount ?? 0} col`,
    );

    // Formulas
    let formulaCount = 0;
    let lastDataCol = -1;
    const examples: string[] = [];
    const riskyOpenRefs: string[] = [];
    for (const block of sh.data ?? []) {
      const sr = block.startRow ?? 0;
      const sc = block.startColumn ?? 0;
      (block.rowData ?? []).forEach((row, ri) => {
        (row.values ?? []).forEach((cell, ci) => {
          const hasVal = cell.userEnteredValue != null;
          if (hasVal) lastDataCol = Math.max(lastDataCol, sc + ci);
          const f = cell.userEnteredValue?.formulaValue;
          if (f != null) {
            formulaCount++;
            const a1 = `${colToA1(sc + ci)}${sr + ri + 1}`;
            if (examples.length < 14) examples.push(`${a1}: ${f}`);
            // Open-ended / whole-column refs are the ones a new column can affect.
            if (/\b[A-Z]{1,3}:[A-Z]{1,3}\b/.test(f) || /\b\d+:\d+\b/.test(f) || /ARRAYFORMULA/i.test(f)) {
              if (riskyOpenRefs.length < 12) riskyOpenRefs.push(`${a1}: ${f}`);
            }
          }
        });
      });
    }
    const rd = rendered.get(title);
    const renderedCol = rd && rd.cols > 0 ? colToA1(rd.cols - 1) : "(none)";
    console.log(
      `  rendered grid (what ensureRowIds reads): ${rd?.rows ?? 0} rows × ${rd?.cols ?? 0} cols  ` +
        `(last rendered col ${renderedCol})`,
    );
    if (rd && lastDataCol >= 0 && rd.cols - 1 > lastDataCol) {
      console.log(
        `  ⚠ rendered width (${renderedCol}) > literal-value width (${colToA1(lastDataCol)}) ` +
          `→ this tab SPILLS from a formula; _rowId would actually append at ${colToA1(rd.cols)}`,
      );
    }
    console.log(`  _rowId append col (literal-value basis): ${colToA1(lastDataCol + 1)}`);
    console.log(`  formulas: ${formulaCount}`);
    if (examples.length) examples.forEach((e) => console.log(`      ${e}`));
    if (riskyOpenRefs.length) {
      console.log(`  ⚠ open/whole-column/ARRAYFORMULA refs (could span a new column):`);
      riskyOpenRefs.forEach((e) => console.log(`      ${e}`));
    }

    // Filters
    if (sh.basicFilter) {
      const r = sh.basicFilter.range;
      console.log(`  BASIC FILTER: ${rangeA1(r)}${openToRight(r) ? "  ⚠ open to the right" : ""}`);
    } else {
      console.log(`  basic filter: none`);
    }
    const fvs = sh.filterViews ?? [];
    if (fvs.length) {
      console.log(`  filter views: ${fvs.length}`);
      fvs.forEach((fv) => console.log(`      "${fv.title}" → ${rangeA1(fv.range)}${openToRight(fv.range) ? "  ⚠ open right" : ""}`));
    }

    // Protected ranges
    const prs = sh.protectedRanges ?? [];
    if (prs.length) {
      console.log(`  protected ranges: ${prs.length}`);
      prs.forEach((pr) =>
        console.log(
          `      ${rangeA1(pr.range)}  warningOnly=${!!pr.warningOnly}  ` +
            `editors=${pr.editors?.users?.join(",") ?? "(none listed)"}  "${pr.description ?? ""}"`,
        ),
      );
    }

    // Conditional formatting
    const cfs = sh.conditionalFormats ?? [];
    if (cfs.length) {
      const cfRanges = cfs.flatMap((cf) => (cf.ranges ?? []).map(rangeA1));
      console.log(`  conditional formats: ${cfs.length} rule(s) over ${cfRanges.join("  ")}`);
    }

    // Data validation (dropdowns etc.)
    let dvCount = 0;
    for (const block of sh.data ?? [])
      for (const row of block.rowData ?? [])
        for (const cell of row.values ?? []) if (cell.dataValidation) dvCount++;
    if (dvCount) console.log(`  data validation cells (dropdowns/rules): ${dvCount}`);

    // Merges, banded ranges, charts
    if (sh.merges?.length) console.log(`  merged ranges: ${sh.merges.length}  →  ${sh.merges.map(rangeA1).join("  ")}`);
    if (sh.bandedRanges?.length) console.log(`  banded (alternating-color) ranges: ${sh.bandedRanges.length}`);
    if (sh.charts?.length) console.log(`  charts: ${sh.charts.length}  ${sh.charts.map((c) => `"${c.spec?.title ?? c.chartId}"`).join(", ")}`);
  }
  console.log(`──────────────────────────────────────────────────────`);
}

main().catch((err) => {
  console.error("\ninspectSheet failed:", err?.message ?? err);
  if (/permission|403|not found|404|invalid|unauthenticated|401/i.test(String(err?.message ?? ""))) {
    console.error(
      "\nHint: re-auth ADC impersonation —\n" +
        "  gcloud auth application-default login \\\n" +
        "    --impersonate-service-account=sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com",
    );
  }
  process.exitCode = 1;
});
