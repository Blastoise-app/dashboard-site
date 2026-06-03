// ONE-TIME controlled first write to NeuralTrust's GEO Tracker tab.
//
// This is the deliberate, announced first mutation of Hailey's live sheet. It:
//   1. Mints _rowId into the GEO Tracker (column L) via the SAME ensureRowIds
//      the deployed sync uses — real write, idempotent (a re-run mints 0).
//   2. Hides column L so the helper column is invisible to humans (matching what
//      Hailey was told: "a single hidden helper column").
// It writes to NOTHING else — not the roadmap, not any other tab/column.
//
// Run (after the announced go, with fresh ADC impersonation creds):
//   GOOGLE_CLOUD_PROJECT=marketing-dashboard-site npx tsx functions/src/firstGeoWrite.ts
import { sheets } from "@googleapis/sheets";
import { GoogleAuth, OAuth2Client, Impersonated } from "google-auth-library";
import { ensureRowIds, colToA1 } from "./lib/sheets-io.js";
import { GEO_REQUIRED_HEADERS } from "./lib/parse-geo-tracker-header.js";

const SHEET_ID = "1Ye47tP_PXUNQz-3m-nY_08dvBF3cCI6ilZ7C-dDqJ3o";
const GEO_TAB = "GEO Tracker";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const INGEST_SA =
  process.env.INGEST_SA_EMAIL ?? "sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com";

// Same impersonation path as sheets-io, replicated here only for the column-hide
// batchUpdate (ensureRowIds uses sheets-io's own client for the mint).
async function client() {
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
    targetScopes: SCOPES,
    lifetime: 3600,
  });
  return sheets({ version: "v4", auth: impersonated as never });
}

async function main() {
  console.log(`\nFirst GEO write → ${SHEET_ID} / "${GEO_TAB}"\n`);

  // 1. Mint _rowId (real). ensureRowIds appends the far-right column + writes
  //    ONLY that column; idempotent.
  const res = await ensureRowIds(SHEET_ID, GEO_TAB, GEO_REQUIRED_HEADERS);
  console.log(`  mint: ${res.minted} _rowId(s) into column ${res.column} (header row index ${res.headerRow})`);

  // Safety: only proceed to hide if the mint landed exactly where we analyzed
  // (column L = index 11). If width shifted it elsewhere, STOP and report — do
  // not hide a column we didn't expect.
  if (res.column !== "L") {
    console.error(`  ✗ UNEXPECTED: mint column is ${res.column}, expected L. Skipping hide — please investigate.`);
    process.exitCode = 1;
    return;
  }

  // 2. Hide column L. Look up the GEO tab's sheetId (gid), then set hiddenByUser.
  const c = await client();
  const meta = await c.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: "sheets.properties(sheetId,title)",
  });
  const geo = (meta.data.sheets ?? []).find((s) => s.properties?.title === GEO_TAB);
  const sheetId = geo?.properties?.sheetId;
  if (sheetId == null) {
    console.error(`  ✗ could not find sheetId for "${GEO_TAB}"; column left visible.`);
    process.exitCode = 1;
    return;
  }
  const col = 11; // L (0-based); cross-checked against res.column === "L" above
  await c.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: col, endIndex: col + 1 },
            properties: { hiddenByUser: true },
            fields: "hiddenByUser",
          },
        },
      ],
    },
  });
  console.log(`  hide: column ${colToA1(col)} (sheetId ${sheetId}) hiddenByUser=true`);
  console.log(`\n✓ done — GEO Tracker now has a hidden _rowId column; nothing else touched.`);
}

main().catch((err) => {
  console.error("\nfirstGeoWrite failed:", err?.message ?? err);
  process.exitCode = 1;
});
