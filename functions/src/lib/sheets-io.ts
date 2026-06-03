// Keyless Sheets API access for the ingest pipeline.
//
// No service-account key file (org policy blocks downloadable keys). Auth comes
// from Application Default Credentials:
//   • Deployed: the function runs AS the ingest SA (set `serviceAccount` on the
//     function); ADC resolves to that identity.
//   • Local:    impersonate the SA —
//       gcloud auth application-default login \
//         --impersonate-service-account=sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com
//
// The sheet must be shared (Editor) with the SA email. Reads use tab NAME, never
// gid. Writes are limited to the hidden _rowId column (see ensureRowIds).
import { sheets, type sheets_v4 } from "@googleapis/sheets";
import { GoogleAuth, OAuth2Client, Impersonated } from "google-auth-library";
import { randomUUID } from "node:crypto";
import { detectHeaderRow, norm, type Grid } from "./header-table.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// The ingest service account. Sheet access is granted by sharing the sheet with
// this email (Editor); auth is keyless. Overridable via env for other projects.
const INGEST_SA =
  process.env.INGEST_SA_EMAIL ??
  "sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com";

let cached: sheets_v4.Sheets | null = null;
async function api(): Promise<sheets_v4.Sheets> {
  if (cached) return cached;
  // (1) Pre-minted impersonation token (local/headless) — skip ADC entirely:
  //   gcloud auth print-access-token --impersonate-service-account=… --scopes=…/spreadsheets
  const token = process.env.SHEETS_ACCESS_TOKEN;
  if (token) {
    const oauth = new OAuth2Client();
    oauth.setCredentials({ access_token: token });
    cached = sheets({ version: "v4", auth: oauth });
    return cached;
  }
  // (2) ADC — the runtime SA when deployed, or `gcloud auth application-default
  // login` locally. Both yield a CLOUD-PLATFORM-scoped token, which the Sheets
  // API REJECTS (it needs the spreadsheets scope). So self-impersonate the
  // ingest SA via IAM Credentials to mint a spreadsheets-scoped token. Requires
  // Token Creator on the SA: the deployer has it locally; the deployed function
  // (which runs AS the SA) needs the SA to have it on itself.
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const source = await auth.getClient();
  const impersonated = new Impersonated({
    sourceClient: source as never,
    targetPrincipal: INGEST_SA,
    targetScopes: SCOPES,
    lifetime: 3600,
  });
  cached = sheets({ version: "v4", auth: impersonated as never });
  return cached;
}

const esc = (title: string): string => `'${title.replace(/'/g, "''")}'`;

// 0-based column index → A1 letters (0 -> "A", 26 -> "AA").
export function colToA1(n: number): string {
  let s = "";
  let x = n + 1;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

// Pad every row to the widest row's width (the Sheets API trims trailing empties,
// which would otherwise drop empty-but-headered columns like Content Reviewed?).
function padGrid(rows: string[][]): Grid {
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  return rows.map((r) => {
    const out = r.map((c) => (c == null ? "" : String(c)));
    while (out.length < width) out.push("");
    return out;
  });
}

/** List every tab (sheet) title in the workbook. */
export async function listTabTitles(spreadsheetId: string): Promise<string[]> {
  const client = await api();
  const res = await client.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  return (res.data.sheets ?? [])
    .map((s) => s.properties?.title ?? "")
    .filter((t) => t !== "");
}

/** Read the given tabs by title; returns title → padded grid. */
export async function fetchSheetTabs(
  spreadsheetId: string,
  tabTitles: string[],
): Promise<Map<string, Grid>> {
  const client = await api();
  const res = await client.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: tabTitles.map(esc),
    valueRenderOption: "FORMATTED_VALUE",
  });
  const vrs = res.data.valueRanges ?? [];
  const out = new Map<string, Grid>();
  tabTitles.forEach((title, i) => {
    const rows = (vrs[i]?.values ?? []) as string[][];
    out.set(title, padGrid(rows));
  });
  return out;
}

export interface EnsureRowIdsResult {
  minted: number;
  column: string;
  headerRow: number;
}

/**
 * Find or append a hidden `_rowId` column on a tab, mint a UUID for every blank
 * data cell, and write back ONLY that column (so reorders/edits elsewhere are
 * untouched). Idempotent — a second run mints 0. `dryRunNoWrite` reports what
 * WOULD be minted without touching the sheet (use for the first run against a
 * live sheet, per the plan's --dry-run-no-write gate).
 *
 * The header row is detected FROM THE SAME read we write against, using the
 * parser's `requiredHeaders` signature — never an index from a separate read,
 * which a concurrent row insert/delete above the header could invalidate (a
 * TOCTOU that would mint ids onto the wrong live-sheet rows). `expectHeaderRow`
 * (optional) cross-checks against a prior read: if the header moved between the
 * reads, we throw and write NOTHING (fail closed); the next run reconciles.
 */
export async function ensureRowIds(
  spreadsheetId: string,
  tabTitle: string,
  requiredHeaders: string[],
  opts: { idColHeader?: string; dryRunNoWrite?: boolean; expectHeaderRow?: number } = {},
): Promise<EnsureRowIdsResult> {
  const { idColHeader = "_rowId", dryRunNoWrite = false, expectHeaderRow } = opts;
  const client = await api();
  const got = await client.spreadsheets.values.get({
    spreadsheetId,
    range: esc(tabTitle),
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rows = (got.data.values ?? []) as string[][];

  // Detect the header on THIS grid — the one we mint into — so the write range
  // can never be skewed by an edit that happened after some earlier read.
  const headerRowIndex = detectHeaderRow(rows, requiredHeaders);
  if (headerRowIndex < 0) {
    throw new Error(
      `ensureRowIds: header row not found in "${tabTitle}" ` +
        `(required: ${requiredHeaders.join(", ")}) — mint aborted (fail closed)`,
    );
  }
  if (expectHeaderRow != null && expectHeaderRow !== headerRowIndex) {
    throw new Error(
      `ensureRowIds: header row moved between reads in "${tabTitle}" ` +
        `(expected row ${expectHeaderRow}, found ${headerRowIndex}) — mint aborted (fail closed)`,
    );
  }

  const header = rows[headerRowIndex] ?? [];
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);

  let idCol = header.findIndex((c) => norm(c) === norm(idColHeader));
  const appending = idCol < 0;
  if (appending) idCol = width;

  const minted: number[] = [];
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const hasData = row.some((c, i) => i !== idCol && String(c ?? "").trim() !== "");
    if (!hasData) continue;
    if (String(row[idCol] ?? "").trim()) continue;
    minted.push(r);
  }

  if (!dryRunNoWrite && (appending || minted.length > 0)) {
    const mintedIds = new Map(minted.map((r) => [r, randomUUID()]));
    const colValues: string[][] = [];
    for (let r = 0; r < rows.length; r++) {
      if (r === headerRowIndex) {
        colValues.push([idColHeader]);
      } else {
        const existing = String(rows[r]?.[idCol] ?? "").trim();
        colValues.push([mintedIds.get(r) ?? existing]);
      }
    }
    const letter = colToA1(idCol);
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: `${esc(tabTitle)}!${letter}1:${letter}${rows.length}`,
      valueInputOption: "RAW",
      requestBody: { values: colValues },
    });
  }

  return { minted: minted.length, column: colToA1(idCol), headerRow: headerRowIndex };
}
