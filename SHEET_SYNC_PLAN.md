# Multi-Tenant Strategy Dashboard — Sheet → Firestore → SPA Implementation Plan

> Status: **Phases 1 + 2 COMPLETE + DEPLOYED (2026-06-02).** Phase 1: `syncSheetsScheduled` is live
> (hourly, Node 22, runs as the ingest SA); sheet→Firestore sync verified end-to-end — first real sheet
> write (20 GEO `_rowId`s into a hidden column L) done + idempotent, live snapshot healthy (20/20 GEO
> rowIds, all sections). KEY FINDING: the "Roadmap Status" tab is a live IMPORTRANGE mirror, treated
> READ-ONLY (no `_rowId`, natural-key join) — no Hailey sheet-protection change needed. **Phase 2: the
> SPA now renders LIVE Firestore** (no bundled fixtures) — `assembleStrategyDoc` composes the `Client` +
> `SheetSnapshot` docs, `useClientStrategy`/`useAgencyClients` subscribe via `onSnapshot`, ideogram
> seeded sheet-less; reviewed (4 medium/low fixes, 0 blockers) and hosting deployed. Phases 3–5 not started.**
> Last revised 2026-06-02.

## Where this stands (2026-06-02)

**Prior workstream — DONE (not this plan).** Auth + hardcoded allowlist, NeuralTrust onboarding,
V6 re-theme, client switcher, and the first deploy are already shipped — that work lives in
`~/.claude/plans/tell-me-where-we-glimmering-bumblebee.md` and the DEVLOG. The dashboard **previously**
rendered a frozen hand-transcribed fixture; **this plan replaced that fixture path with a real
Sheet → Firestore → SPA pipeline that is now LIVE — Phases 0–2 shipped 2026-06-02** (the SPA renders
live Firestore, no bundled fixtures).

**Decisions locked (2026-05-29):** SA = **Editor** · cadence = **hourly** · review write-back to
sheet = ~~yes, write-only I/J~~ **SUPERSEDED → DROPPED (see Phase 4: roadmap is a read-only
IMPORTRANGE mirror; review state is Firestore-only)** · Node = **bump to 22 now** · SA auth = **keyless**
(org policy blocks downloadable keys, and keyless is more secure anyway) · login stays **gated
off** until Thomas reviews the live data. (Details in "Decisions Thomas must make".)

**Phase 0 — substantially DONE (2026-05-29):**
- ✅ Service account created: `sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com`
- ✅ APIs enabled: Sheets, Secret Manager, IAM Credentials
- ✅ Keyless auth proven: `thomas@blastoise.app` granted `serviceAccountTokenCreator` on the SA
  (narrow, SA-scoped only); minted a Sheets-scoped impersonation token successfully — no key exists.
- ✅ `.gitignore` hardened for SA creds.
- ✅ Parser library built + offline-verified (20 unit/parity tests green, strict tsc clean):
  `functions/src/lib/header-table.ts` (header-driven engine), `parse-roadmap-status.ts`,
  `parse-clusters-stacked.ts`, `parse-geo-tracker-header.ts`, `parse-kpi.ts`, `snapshot.ts`
  (validateSnapshot gate), `sheets-io.ts` (keyless fetch + `ensureRowIds`), `devSync.ts`
  (read-test). `@googleapis/sheets`@13 + `google-auth-library`@10 added. Shared types gained
  `rowId?` (deliverable + geo keyword), `SheetSnapshot.title/subtitle`, `SheetTabTitles`.
  (Geometry assumptions all confirmed by the live read below.)
- ✅ **Dashboard refreshed from the live sheet** (interim win, no deploy): `functions/src/refreshFixture.ts`
  pulls the live sheet through the parsers, validates (fail-closed), and regenerates
  `web/src/fixtures/neuraltrust.json` (53 clusters / 20 geo / 19 deliverables / 11 kpi, cleaned
  names, thousands-formatted SV). Web build green. The bundled dashboard now reflects current sheet
  data instead of the frozen May-13 transcription — superseded by the Firestore live-sync (Phase 1).

**Phase 0 — read path PROVEN (2026-05-29):** Hailey shared the sheet with the SA (Editor). The
keyless live read succeeds end-to-end (impersonation token via `SHEETS_ACCESS_TOKEN`, no key file).
Confirmed against the live sheet via `devSync`: 8 tabs (titles exact), clusters **5 groups / 53
rows** (horizontal-layout assumption was correct), GEO **9 levers grouped right**, roadmap **3
months sorted May→June→July / 19 deliverables**, KPI **11 objectives + 3 targets**; values
spot-checked (cluster "AI security" 13,200/65; GEO coverage correct; deliverable SV 990, In Review,
doc link present). `validateSnapshot` clean.

**Phase 0 `_rowId` write — DONE on GEO, intentionally DROPPED on roadmap (2026-06-02):** the first
real write minted 20 GEO `_rowId`s into a hidden column L and is idempotent (a 2nd run minted 0). The
roadmap is NOT minted: the "Roadmap Status" tab is a live `=IMPORTRANGE(...)` mirror of an upstream
master doc (its whole grid is spill output, fully protected), so a `_rowId` column there is impossible
to write and would be unstable (ids wouldn't track upstream reorders). Roadmap rows are joined by
natural key (Phase 4). No sheet-protection change from Hailey was needed.

**Finding — cluster group names changed (RESOLVED):** the live sheet's group labels differ from the
old frozen fixture and carry a redundant trailing "(N)" count. **DECIDED: strip the trailing count**
(keep the rest, incl. mid-string parens like "(GAF)"). Applied in `parse-clusters-stacked.ts`; live
read confirms: "AI agent security - Prio", "Runtime security (GAF) - Prio", "AI compliance",
"Threat Detection", "Competitors". (The dashboard will show these instead of the old hand-prettified
names — sheet = source of truth.)

**Phases 1 + 2 — COMPLETE + DEPLOYED (2026-06-02).** The hourly `syncSheetsScheduled` is live and the
sheet→Firestore sync is verified end-to-end; the SPA now renders that live Firestore data (no bundled
fixtures) — see the Phase 1 and Phase 2 sections. **Phases 3–5 — NOT started** (client sign-in,
server-authoritative review state, graduate off Sheets).

### Phase 0 live-read checklist — ✅ RAN + CONFIRMED (2026-05-29)

All assumptions were verified empirically via `devSync` against the live sheet:
- ✅ **Clusters:** 5 groups / 53 rows, horizontal layout (the big assumption held). Real labels read
  correctly (after stripping trailing counts): "AI agent security - Prio", "Runtime security (GAF) -
  Prio", "AI compliance", "Threat Detection", "Competitors" — not generic "Cluster N", and SV/KD
  populate (e.g. "AI security" 13,200/65), not zeros. (`validateSnapshot` `expect` minimums guard
  against a future catastrophic shortfall.)
- ✅ **Roadmap:** `MONTH 1 — May 2026 | MONTH 2 — June 2026 | MONTH 3 — July 2026` in order; 19
  deliverables; large SVs render in full (the `splitSvKd` thousands-separator fix holds).
- ✅ **GEO:** 9 levers grouped SEO(3)/GEO(6) correctly; SV column found; 20 keywords.
- ✅ **`ensureRowIds` (write path) — DONE on GEO (2026-06-02).** Minted 20 `_rowId`s into GEO Tracker
  column L (then hidden), idempotent (a 2nd run minted 0). The roadmap is NOT written — it's a
  read-only IMPORTRANGE mirror (see the Phase 0 `_rowId` note above and the Phase 1 status). A faithful
  local run under the same SA identity produced a healthy Firestore snapshot (`checkSync`: ✓ healthy).

## Summary

Stand up the production data pipeline for the dashboard, with Growth Marketing Pro (agency
`gmp`) and its first client NeuralTrust (`neuraltrust`) as customer #1. A Google **service
account** reads each client's shared Google Sheet via the Sheets API; a **header-driven
parser** (matching by column *name*, never index) produces a validated `SheetSnapshot`
carrying stable **opaque rowIds** minted into a hidden sheet column; a **scheduled Cloud
Function** writes that snapshot to Firestore. The SPA then reads Firestore live
(`onSnapshot`) instead of bundled JSON fixtures, and a server-authoritative `markReviewed`
callable replaces the localStorage-only content-review tracking.

Architecture: **Sheet → validated → Firestore → SPA**, with a strict split source of truth —
the sheet-derived snapshot is read-only and server-written; the human review bit lives in its
own Firestore collection keyed by rowId.

## Source of truth & how good companies do it

**Source of truth.** The Google Sheet remains the single source of truth for *strategy/roadmap
content* (clusters, GEO coverage, deliverables, KPIs); Firestore holds a *derived, validated
snapshot* that is fully overwritten on each sync (any manual edit to the snapshot doc is
intentionally clobbered). The one mutable surface owned by the app — not the sheet — is the
per-row **review state**, which lives in its own collection so the read-only snapshot is never
mutated.

**How good companies do it.** Ingest runs unattended on a schedule against a
service-account-shared sheet (not a public CSV), parses by header name so humans can
reorder/add columns without breaking the feed, and **fails closed** — a validation gate
refuses to overwrite the last-good snapshot when the parse is malformed *or the Sheets API
errors* (403 not-shared, 404 bad id, 429 quota). Writes are server-only (admin SDK +
callables enforce claims that mirror Firestore rules); the client reads live via
subscriptions and never trusts bundled fixtures at runtime.

---

## Shared contracts (pinned once — all phases must agree)

### Firestore document paths

| Path | Shape | Writer | Readers |
|---|---|---|---|
| `/agencies/{agencyId}` | `Agency` | seed / admin SDK | platform_admin, agency-of, client-in-agency |
| `/agencies/{agencyId}/clients/{clientId}` | `Client` | seed / admin SDK | platform_admin, agency-of, client-of |
| `/agencies/{agencyId}/clients/{clientId}/sheetSnapshots/strategy` | `SheetSnapshot` | `syncSheetsScheduled` (admin SDK) | platform_admin, agency-of, client-of — **read-only** |
| `/agencies/{agencyId}/clients/{clientId}/contentReviewState/{rowId}` | `ContentReviewState` | `markReviewed` callable (admin SDK) | same readers — **write:false in rules** |
| `/auditLog/{eventId}` | `AuditEvent` (+ optional `meta`) | callables (admin SDK) | platform_admin only |

Canonical instances for client #1: `/agencies/gmp/clients/neuraltrust`, then `…/sheetSnapshots/strategy` and `…/contentReviewState/{rowId}`.

The review state is **one doc per rowId** at `contentReviewState/{rowId}` — never a single
shared doc, and never written into the snapshot.

### Assembled view + snapshot shape

The SPA keeps rendering its existing `StrategyDoc` (`web/src/lib/fixtures.ts`), assembled at
read time from **two** Firestore docs. We do **not** add a parallel `StrategyView` type to
`@shared/types` (it would duplicate `StrategyDoc` and drift) — `assembleStrategyDoc` returns
the existing web `StrategyDoc`.

```ts
StrategyDoc = { slug, title, subtitle, brand, lastUpdated, overview?, clusters, geoTracker, roadmap, kpi?, contentReview? }
```

- `slug`, `brand`, `name` come from the **`Client`** doc.
- `title`, `subtitle`, the data sections, and `syncedAt` come from the **`SheetSnapshot`** doc.
  `SheetSnapshot` gains required `title: string` + `subtitle: string`; `syncedAt: Timestamp`
  is the canonical freshness source, mapped to `StrategyDoc.lastUpdated` (ISO).
- `contentReview` is left undefined; `StrategyView` already derives it from `roadmap` via
  `deriveContentReview`.

**Round-trip contract (load-bearing).** **(Note 2026-06-02:** neuraltrust now reads its REAL synced
`SheetSnapshot`, so its `lastUpdated` comes from the live `syncedAt`, not from a fixture. The fixture
round-trip below applies to **fixture-seeded clients with no live sheet** — e.g. ideogram — via
`seedClientFromFixture`.) A fixture (e.g. `ideogram.json`) is a **flat** `StrategyDoc`
(slug/title/subtitle/brand/lastUpdated at top level, with `lastUpdated` as an ISO string). The seed
path (`seedClientFromFixture`) must **split** it: brand/slug/name → `Client`; sections + title +
subtitle → `SheetSnapshot`; `lastUpdated` ISO **→ `syncedAt` Timestamp**. The read path
(`assembleStrategyDoc` + `tsToIso`) must **reassemble it identically**: `syncedAt` Timestamp **→
`lastUpdated` ISO**. Seed-then-read must produce the same `StrategyDoc` the fixture started as.

### rowId scheme (the join key)

- A hidden column with header **`_rowId`** (case-insensitive) is appended to the **GEO Tracker**
  tab only. **The roadmap is NOT minted** — its "Roadmap Status" tab is a live `=IMPORTRANGE(...)`
  mirror of an upstream master doc (whole grid is spill output, fully protected); a `_rowId` column
  there is impossible to write and would be unstable (ids wouldn't follow upstream reorders). Roadmap
  rows are joined by **natural key** (Keyword + Type + month) in Phase 4.
- Each GEO data row gets a `crypto.randomUUID()` minted **once**, written back to only that column's
  A1 range, then the column is hidden; ids are never reused or rewritten.
- `rowId` is the stable join key for GEO across `SheetSnapshot` ↔ `contentReviewState` ↔ the SPA,
  surviving row reorders/inserts. `GeoTrackerKeyword.rowId?` carries it; `RoadmapDeliverable.rowId?`
  is left unset (natural-key join); `ContentReviewItem.rowId` is required.
- **No positional fallback in the write path.** The `m{mi}-d{di}` positional id is for
  *rendering legacy fixtures only*; the "Mark reviewed" button is **gated on a real minted
  rowId** and is read-only otherwise. (We do not write review state against positional ids —
  it would orphan the moment real rowIds exist.)

### Service account & auth (KEYLESS)

- **One** GCP service account, `sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com`,
  in project `marketing-dashboard-site` (matches `.firebaserc`). Sheet access is granted by
  *sharing the sheet with the SA email* (Editor), not by project IAM roles.
- Scope: `https://www.googleapis.com/auth/spreadsheets` (read **and** write — write is required
  to mint `_rowId` and mirror reviews). This single SA covers everything; no second writeback SA.
- **No downloadable key** — org policy `iam.disableServiceAccountKeyCreation` blocks them, and
  keyless is the more secure path regardless. Two auth contexts:
  - **Deployed functions** (`syncSheetsScheduled`, `markReviewed`): run *as* the SA — set
    `serviceAccount: 'sheets-ingest@…'` on the function. **IMPLEMENTED + PROVEN (2026-05-30):**
    `sheets-io.ts` self-impersonates via `google-auth-library` `Impersonated` to mint a
    `spreadsheets`-scoped token (the metadata server's default `cloud-platform` is rejected by the
    Sheets API). Two IAM grants were required, both done: the SA holds `serviceAccountTokenCreator`
    **on itself** (so the deployed function can self-impersonate) **and** `roles/datastore.user` (so
    it can read/write Firestore — without it every run died `PERMISSION_DENIED` on the first
    Firestore read). Deployer (thomas) already had `iam.serviceAccountUser` (deploy succeeded).
    **Caveat (RESOLVED 2026-06-02):** protected ranges block writes even for an Editor SA — but we no
    longer write to any protected tab. The roadmap (the only protected write target) is now read-only;
    the GEO Tracker is unprotected. So no editor-exception from Hailey is needed. (This was the Phase 1
    blocker until the IMPORTRANGE finding reframed it — see the `_rowId` scheme above.)
  - **Local dry-run / proof:** impersonate the SA — `thomas@blastoise.app` already has
    `serviceAccountTokenCreator` on it. Mint a token via `gcloud auth print-access-token
    --impersonate-service-account=… --scopes=…/spreadsheets`, or set ADC impersonation with
    `gcloud auth application-default login --impersonate-service-account=…`.
  - **No `GMP_SHEETS_SA` secret and no `functions/.secret.local` key** — superseded by keyless.

### Claims contract (mirrored in code and rules)

`platform_admin` → all. `agency` → `claims.agencyId === agencyId`. `client` →
`claims.clientKeys` includes `"${agencyId}/${clientId}"`. Note **both** `clientKeys` *and*
`clientAgencies` are emitted by `buildClaims` and load-bearing in rules (`clientAgencies` backs
the `/agencies/{agencyId}` doc read via `isClientInAgency`). agencyId is **not** in the URL
(`/agency/clients/:slug`); resolve it from claims (agency → `claims.agencyId`; client → first
segment of the matching `clientKeys` entry; platform_admin → constant `'gmp'` for now,
documented TODO for multi-agency — the read path must assert the resolved agencyId matches the
client's actual parent or 404 cleanly).

---

## Phase-by-phase plan

### Phase 0 — Backend ingest core (library + dry-run, no deploy)

**Goal.** Sheets-API client, header-driven parsers, rowId minting, snapshot compose+validate,
for a single hardcoded NeuralTrust config. Replaces `scripts/build-neuraltrust.mjs` and the
public-CSV gid fetch.

**File changes (absolute paths).**
- `.gitignore` — *modify, FIRST.* Add `functions/.secret.local`, `*.secret.local`, `key.json`,
  `**/service-account*.json` **before** generating any SA key. (Today `.gitignore` covers
  `.env.local` and `secrets/` but **not** `functions/.secret.local` — the key could be committed.)
- `functions/package.json` — *modify.* Promote to direct deps: `"googleapis": "^144.0.0"`,
  `"google-auth-library": "^9.14.0"`. Keep `firebase-admin ^13.8.0` / `firebase-functions ^7.2.5`.
  `npm --prefix functions install`.
- `functions/src/lib/sheets.ts` — *create.* `fetchSheetTabs(sheetId, tabTitles)` (`GoogleAuth`
  w/ `spreadsheets` scope via keyless ADC — runtime SA when deployed, impersonation locally;
  `values.batchGet` `FORMATTED_VALUE`;
  **pad every row to header width** — Sheets trims trailing empties); `ensureRowIds(sheetId,
  tabTitle, values, idColHeader='_rowId')` (find/append `_rowId` via `appendDimension`; mint
  `crypto.randomUUID()` for blank cells; write back **only** that column's range; idempotent;
  **honors a `dryRunNoWrite` flag** — see verification); `class HeaderTable` (`col`/`colOpt`/
  `rows`/`get`, case-insensitive trimmed name); `detectHeaderRow(values, required)`.
- `functions/src/lib/parse-roadmap-status.ts` — *create.* `parseRoadmapStatus(values): Roadmap`,
  header-driven (`['Type','Keyword','Status']`); rows matching `/^MONTH\s+\d+/i` start a month;
  read fields by name (`Credits`, `Type`, `Keyword`, `Doc`/`Doc Link`, `Existing URL`/`Live URL`,
  `SV`/`Search Volume`, `Status`, `As Of`/`Date`, `Notes`/`Why`/`Rationale`); **split packed
  `"990, 57"` SV/KD cells** on comma; carry `rowId`; sum `totalCredits`; **sort months
  chronologically** by the trailing month name. No column-index literals.
- `functions/src/lib/parse-clusters-stacked.ts` — *create.* Detect horizontal block starts by
  scanning row 1 for `/^keyword$/i` (replaces hardcoded `[0,5,10]`); read Keyword/SV/KD/optional
  CPC relative to each block; omit `cpc` when absent.
- `functions/src/lib/parse-geo-tracker-header.ts` — *create.* `detectHeaderRow` finds the lever
  row; band row above maps each lever column to SEO/GEO (fallback: first 3 levers = SEO);
  `lever.id = toCamel(label)`; carry `rowId`; sort by SV desc.
- `functions/src/lib/parse-kpi.ts` — *create.* Detect the two sub-tables by distinguishing
  columns (`Funnel` → objectives; `M3`/`M6`/`M12` → targets); all reads by header name; returns
  `KpiReport`.
- `functions/src/lib/snapshot.ts` — *create.* `buildSnapshotFromSheet(client)` (fetch →
  ensureRowIds on roadmap+geo → 4 parsers → assemble); `validateSnapshot(s): string[]` (≥1
  cluster group w/ rows, ≥1 geo keyword, ≥1 roadmap month w/ deliverables, every deliverable +
  keyword has non-empty rowId, every coverage a valid `CoverageStatus`, `totalCredits` matches
  sum; empty list = valid → the write gate); `writeSnapshot(...)` (`.set` full overwrite on
  success + merge `lastFetchedAt`/`status:'ok'`; **on validation OR Sheets-API error** set
  `status:'error'` + `lastError` **without overwriting** the snapshot). `ClientSheetConfig {
  agencyId, clientId, sheetId, tabTitles{roadmap,geoTracker,clusters,kpi} }`.
- `shared/types.ts` — *modify.* `RoadmapDeliverable.rowId?: string`, `GeoTrackerKeyword.rowId?:
  string`; `SheetSnapshot.title: string` + `subtitle: string`; `SheetConnection.tabTitles?`.

**Human/GCP setup.**
- ✅ DONE 2026-05-29: SA created; Sheets + Secret Manager + IAM Credentials APIs enabled;
  `thomas@blastoise.app` granted `serviceAccountTokenCreator` on the SA; keyless token mint proven.
- ⬜ **Share the NeuralTrust sheet** (`1Ye47tP_…`) with `sheets-ingest@…` as **Editor** (write
  needed for rowId minting + review mirror). Thomas or Hailey. — *remaining gate.*
- ⬜ For a Node-based local dry-run: `gcloud auth application-default
  login --impersonate-service-account=sheets-ingest@…` (only if not using the `print-access-token`
  path).
- ⬜ Read the **exact tab titles** off the live sheet; confirm header names (or add `colOpt`
  aliases — never switch back to indexes).

**Verification.**
- **First minting run is `--dry-run-no-write`** (or against a *copy* of the sheet): a buggy
  parser must not append `_rowId`/UUIDs to the production sheet irreversibly. Only after the
  parse looks right do we run the real minting pass.
- Scratch `functions/src/devSync.ts` printing counts + `validateSnapshot()` problems. Expect
  parity with the fixture: geoKeywords **20**, clusterRows **53**, deliverables **19** across
  **3** months (May/June/July), kpiObjectives **11**. (NB: the fixture's `lastUpdated` is already
  `2026-05-13` and its months are already chronological — the hardcoded date and the raw-sheet
  July/May/June order are defects in `build-neuraltrust.mjs` / the sheet read, not the fixture.)
- After the real minting pass: the **GEO Tracker** tab has a populated (then hidden) trailing
  `_rowId` column and only that column changed; a 2nd run mints `0` (idempotent). The **roadmap is
  not minted** (read-only IMPORTRANGE mirror — see the `_rowId` scheme).
- `npm --prefix functions run build` (strict, `noUnusedLocals`) + lint clean. **No unused
  imports** in `devSync.ts` (predeploy gate fails otherwise).

**Independently shippable.** Yes (library + dry-run; no deploy).

---

### Phase 1 — Scheduled ingest function, Firestore-driven config, seed + rules

**Goal.** Wrap Phase 0 in a deployable `syncSheetsScheduled` (hourly), enumerate Firestore
client docs instead of the hardcoded config, add `seedClient`, retire the legacy CSV path.

**STATUS — COMPLETE + PROVEN (2026-06-02).**
- ✅ Files created/modified: `syncSheets.ts` (hourly, runs as SA, fail-closed per client),
  `lib/ingest.ts` (fetch → mint → re-fetch → parse → assemble), `seedClient.ts`, `checkSync.ts`
  (ops read), `index.ts` export (no `markReviewed`). Node 22 bump done (firebase.json runtime +
  engines + `@types/node`). `clients/neuraltrust.json` reshaped (`tabTitles` + `expectMinimums` +
  `name`/`allowedDomains`); `fetch-sheet.mjs` **guarded** to skip clients carrying `tabTitles`
  (legacy GitHub Action deletion deferred until the sync is proven). New types: `Client.reportTitle`/
  `reportSubtitle`, `SheetConnection.expectMinimums`.
- ✅ Hardening from the adversarial review (workflow, 5 dimensions, 1 confirmed finding): fixed a
  **TOCTOU in `ensureRowIds`** — it now detects the header on its OWN read via the parser's
  required-header signature and cross-checks the caller's index, failing closed if the header moved
  between reads (a concurrent row insert can no longer skew the mint). Enabled Firestore
  `ignoreUndefinedProperties` in `admin.ts` (parsers emit `undefined` for absent optional fields,
  which the Admin SDK would otherwise reject on write).
- ✅ Deployed: `syncSheetsScheduled(us-central1)` created on Node 22 (and `beforeCreateUser` bumped
  to Node 22). Cloud Scheduler job `firebase-schedule-syncSheetsScheduled-us-central1` (every 1
  hours, ENABLED). Client seeded at `agencies/gmp/clients/neuraltrust`.
- ✅ Proven in production: Firestore enumeration works (`datastore.user` granted); keyless deployed
  Sheets auth works (self-impersonation reached the sheet); fail-closed works (error →
  `status:'error'`, snapshot not clobbered).
- ✅ **COMPLETE (2026-06-02):** a read-only inspection found the "Roadmap Status" tab is a live
  `=IMPORTRANGE(...)` mirror (whole grid spill output, fully protected) — so minting a `_rowId` there
  is impossible AND wrong (ids wouldn't track upstream reorders). Reworked the ingest to mint `_rowId`
  on the **GEO Tracker only** and treat the roadmap **read-only** (joined by natural key in Phase 4);
  validation requires rowIds for GEO only. Re-reviewed (adversarial workflow, no blockers). The first
  real sheet write minted **20 GEO `_rowId`s into hidden column L** and is idempotent (2nd run: 0). The
  reworked function is deployed; a faithful local run (same SA identity) wrote a healthy Firestore
  snapshot — `checkSync`: **✓ healthy** (20/20 GEO rowIds; roadmap 0/19 read-only; all sections). **No
  sheet-protection change from Hailey was needed.** New ops tools: `inspectSheet.ts`, `firstGeoWrite.ts`,
  `runSyncOnce.ts`.

**File changes.**
- `functions/src/syncSheets.ts` — *create.* `syncSheetsScheduled = onSchedule({ schedule:'every 1 hours',
  timeZone:'Etc/UTC', serviceAccount:'sheets-ingest@marketing-dashboard-site.iam.gserviceaccount.com',
  region:'us-central1', timeoutSeconds:120, memory:'256MiB' }, …)` — runs **as** the ingest SA
  (keyless, no `defineSecret`) →
  for each active client config: build → validate → write or record error; log counts. Enumerate
  `/agencies/*/clients/*` whose `dataSources.sheet.id` + `tabTitles` are set. `fetchSheetTabs`
  must classify 403/404/429/network errors as `status:'error'` + `lastError` without clobbering.
  *(`syncSheetsNow` on-demand callable is OPTIONAL — defer; the schedule + a CLI/emulator trigger
  covers v1.)*
- `functions/src/seedClient.ts` — *create.* Mirrors `seedAgency.ts`. `npx tsx
  functions/src/seedClient.ts gmp neuraltrust <sheetId>` writes `agencies/gmp/clients/neuraltrust`
  (`id`, `slug`, `name`, `brand`, `allowedDomains:['neuraltrust.ai']`, `dataSources.sheet{ id,
  status:'unverified', tabTitles }`, `createdBy:'seed'`, `createdAt: serverTimestamp()`).
- `functions/src/index.ts` — *modify.* Add `export { syncSheetsScheduled } from './syncSheets.js';`
  **only.** Do **NOT** export `markReviewed` here — that file doesn't exist until Phase 4 and the
  export would break the `tsc` predeploy build. The `markReviewed` export lands in Phase 4.
- **Retire the legacy CSV path (same PR as the config edit).** `refresh-data.yml` loops over
  *every* `clients/*.json` and runs `fetch-sheet.mjs <slug>` against `config.tabs[*].gid`. The
  moment `clients/neuraltrust.json` drops `tabs{gid}` for `tabTitles`, `fetch-sheet.mjs` crashes
  on `Object.entries(config.tabs)` under `set -e`. Fix in this PR — pick one:
  (a) skip `neuraltrust.json` in the workflow loop / `fetch-sheet.mjs`, **or**
  (b) keep the new ingest config OUT of `clients/*.json` so the legacy loop is untouched, **or**
  (c) delete the legacy GitHub Action outright (recommended once Phase 1 sync is proven).
  Also plan to delete `scripts/build-neuraltrust.mjs` and `docs/neuraltrust/data.json` once the
  Firestore feed is live — they become misleading stale sources of truth.
- `clients/neuraltrust.json` — *modify.* `agencyId:"gmp"`, `clientId:"neuraltrust"`, `tabTitles{
  roadmap, geoTracker, clusters, kpi }` (exact live titles), keep `sheetId`.
- `firestore.rules` — **no reviewState changes here.** All `contentReviewState` rules are added
  in Phase 4 only (do not ship a partial/inconsistent rule that Phase 2/3 reads could hit).

**Human/GCP setup — DONE (2026-05-30):** enabled `cloudscheduler.googleapis.com`; granted the SA
`serviceAccountTokenCreator` on itself + `roles/datastore.user`; `firebase deploy --only functions`;
seeded via `GOOGLE_CLOUD_PROJECT=marketing-dashboard-site npx tsx functions/src/seedClient.ts
neuraltrust` (reads `clients/neuraltrust.json`). *(Aside: gcloud **user** creds expire at the org
auth-policy boundary mid-session; the IAM grants and scheduler triggers were applied via the
Resource Manager / Cloud Scheduler REST APIs using the fresh ADC token, to avoid repeated
interactive logins.)* **REMAINING — NONE (2026-06-02):** the IMPORTRANGE finding made the roadmap
read-only, so the GEO Tracker (unprotected) is the only write target — no editor-exception from Hailey
is needed. Phase 1 is complete.

**Verification — DONE (2026-06-02).** A faithful local run (same SA identity as the deployed function)
wrote `…/sheetSnapshots/strategy` with all sections + `syncedAt` + **GEO rowIds (20/20)** (roadmap is
read-only — no rowIds). `checkSync`: ✓ healthy. Validation gate proven fail-closed (a problem list →
doc not overwritten, `status:'error'` + `lastError`). The hourly `syncSheetsScheduled` is deployed;
its next scheduled tick self-confirms the production path.

**Independently shippable.** Yes (depends on Phase 0 library).

---

### Phase 2 — SPA reads Firestore live (ships *with* the seed script)

> **STATUS: ✅ COMPLETE + DEPLOYED (2026-06-02).** All file changes below are done and live on
> `marketing-dashboard-site.web.app`. ideogram seeded sheet-less via `seedClientFromFixture.ts`; both
> clients verified end-to-end (`functions/src/verifyPhase2.ts`). Adversarial review (6 dims) surfaced
> 4 medium/low items (hook reset-on-disable, `tsToIso` nanos, two stale comments) — all fixed; no
> isolation/leak blockers. The client-role path deliberately does **not** open the agency-clients
> listener (the collection *list* query is denied by rules for clients).

**Goal.** Stop rendering bundled fixtures. `ClientView` subscribes to the two composing docs;
`AgencyHome` + Topbar switcher list real clients; freshness from `syncedAt`.

**Current state (2026-06-02 — what's already in place for this phase):**
- ✅ neuraltrust `Client` doc seeded (`seedClient.ts`) **and** a **real `SheetSnapshot`** at
  `agencies/gmp/clients/neuraltrust/sheetSnapshots/strategy` (live sync, healthy).
- ✅ Firestore read rules for `clients/{id}` and `sheetSnapshots/{tabKey}` already exist
  (`firestore.rules` — verified) → **no rules change needed.**
- ✅ Firebase web config (`VITE_FIREBASE_*`) already wired (client sign-in already works), so the
  browser can read Firestore.
- ⬜ Still to do: the React wiring below (`assembleStrategyDoc` / `useClientStrategy` / `ClientView` /
  `AgencyHome` / `Topbar`); seed **ideogram** into Firestore (no live sheet) so it lists + renders;
  resolve `agencyId` (trivial today — only `gmp` exists; the admin cross-agency lookup is a noted TODO).

> **Ordering (REVISED 2026-06-02 — Phase 1 is done):** neuraltrust now has a REAL `SheetSnapshot` in
> Firestore **and** a `Client` doc, so the UI has real data for client #1 with **no seeding**.
> `seedClientFromFixture` is therefore needed **only** for **fixture-only clients with no live sheet**
> (e.g. ideogram) — to give them a `Client` doc + snapshot so they appear in the agency list and
> render. It is no longer a "before the Phase 1 writer exists" dependency-breaker.

**File changes.**
- `web/src/lib/strategyDoc.ts` — *create.* `clientDocPath`, `strategySnapshotPath`, `tsToIso(ts)`
  (handle both the `Timestamp` class via `.toDate()` and the plain `{seconds,nanoseconds}` shape;
  `''` when undefined), `assembleStrategyDoc(client, snap): StrategyDoc` (returns the existing
  web `StrategyDoc` — no new shared type).
- `web/src/lib/useClientStrategy.ts` — *create.* Subscribes to both docs; resolves `agencyId`
  from claims; assembles only after **both** listeners fire once; exposes `{ doc, loading, error,
  notFound, snapshotMissing }`. **Explicit empty states:** Client-exists-but-snapshot-absent →
  `snapshotMissing` (don't hang in loading forever); permission-denied → `error`. Also export
  `useAgencyClients(agencyId)`.
- `web/src/views/client/ClientView.tsx` — *modify.* Swap `getFixture(slug)` →
  `useClientStrategy(agencyId, slug)`; render loading / notFound / snapshotMissing / error;
  on success `<StrategyView doc={doc} clients={…} />`.
- `web/src/views/agency/AgencyHome.tsx` — *modify.* Swap `listFixtures()` →
  `useAgencyClients(agencyId)`; "No clients yet" empty state.
- `web/src/views/client/strategy/StrategyView.tsx` — *modify.* Add optional `clients?:
  {slug,title}[]` prop, pass to `<Topbar>`. **Coordinate with Phase 4** (which also touches this
  file's `buildSections` signature) so the two phases don't conflict.
- `web/src/views/client/strategy/Topbar.tsx` — *modify.* Add a new `clients` prop (Topbar today
  has `{brandName,title,lastUpdated,slug,onToggleToc}` and derives the switcher from
  `listFixtures()` itself). Switch the switcher to the `clients` prop **but preserve the
  claims-based `canSwitch` gating** (agency/admin only).
- `web/src/lib/fixtures.ts` — *modify.* Demote to dev-seed-only (keep `StrategyDoc` export +
  `getFixture`/`listFixtures` for the seed script and `ReportingView`/`PerformanceView` type
  imports); top-of-file comment that fixtures are no longer rendered at runtime. No deletion.
- `functions/src/seedClientFromFixture.ts` — *create.* **For fixture-only clients with no live sheet
  (ideogram).** `npx tsx functions/src/seedClientFromFixture.ts <agencyId> <fixtureSlug>` reads
  `web/src/fixtures/<slug>.json`, **splits** the flat `StrategyDoc` into the `Client` doc
  (brand/slug/name) and the `SheetSnapshot` doc (sections + title + subtitle + `syncedAt` from ISO
  `lastUpdated`), `merge:true` — the exact inverse of `assembleStrategyDoc` (round-trip contract
  above). NB: distinct from the existing **`seedClient.ts`** (config `clients/*.json` → `Client` doc
  only, for **sheet-backed** clients like neuraltrust, whose snapshot is written by the live sync, not
  here). Run once for ideogram so it appears in the agency list + renders.
- `firestore.indexes.json` / rules — *verify.* The existing `clients/{id}` `allow read` rule covers
  `AgencyHome`'s `collection(agencies/{a}/clients)` **list** query (Firestore `read` = get + list).
  Add a composite index only if that query orders/filters (the MVP list does neither). Read rules for
  `clients` + `sheetSnapshots` are **confirmed present — no rules change needed.**

**Human/GCP setup.** `web/.env.local` (`VITE_FIREBASE_*`) is already filled (sign-in works) and the
read rules are already deployed (`clients` + `sheetSnapshots`) — so **no `firestore:rules` deploy and
no env work are expected** for this phase. Build + ship the web bundle only.

**Verification.** Both builds pass; `/agency` lists the real client card(s); click-through renders
the live `StrategyView` from the **real synced snapshot** (neuraltrust shows the live `syncedAt`
freshness, 20 geo / 53 clusters / 19 deliverables); re-running the sync (or a seed) bumps `syncedAt`
and the badge updates **without reload** (proves the subscription); `ClientView`/`AgencyHome` no
longer import `getFixture`/`listFixtures` for rendering.

**Independently shippable.** Yes — ships its own seed script.

---

### Phase 3 — Enable first client sign-in

> **✅ COMPLETE + DEPLOYED (`30d9bab`, 2026-06-03).**
> `neuraltrust.ai` is enabled in `CLIENT_DOMAINS` (whole domain). A 6-dimension adversarial
> isolation review returned `safeToShip=true` / 0 blockers / **no isolation breach**, but flagged
> 2 high-severity go-live *lockouts* (a legit client 403'd onto `/agency` via the `/` index
> redirect, the `from` replay, and ClientView's BackLink). All fixed (shared `roleHome`/`canAccess`,
> role-aware `HomeRedirect`, `from`-sanitization, client-hidden BackLink) + a low blocking-trigger
> hardening (best-effort `/users/{uid}` write). Builds + 20 parser tests green. Deployed
> `functions,hosting` (`beforeCreateUser` + `syncSheetsScheduled` updated, hosting released);
> smoke-check green. **Only open item is human:** walk the real sign-in matrix with an actual
> @neuraltrust.ai account (landings + cross-slug 403) — not automatable.

**Goal.** Let a real client domain sign in, route-restricted to its own slug.

**File changes.**
- `functions/src/lib/auth.ts` — *modify.* In `CLIENT_DOMAINS` add the verified domain, e.g.
  `'neuraltrust.ai': [{ agencyId:'gmp', clientId:'neuraltrust' }]` (or a full-email key for a
  single-person pilot). No logic change — `resolveAccess`/`buildClaims` already emit
  `clientKeys=['gmp/neuraltrust']` + `clientAgencies`.

**Human/GCP setup.** Confirm the verified corporate domain (never free-mail); `firebase deploy
--only functions` (blocking trigger reads the allowlist from the deployed bundle); have the
pilot client sign in once with Google so the trigger mints `/users/{uid}` + claims.

**Verification.** Enabled client → auto-redirect to `/agency/clients/neuraltrust`, can read it;
other slug or `/agency` → `ForbiddenState`. Negative: a client `onSnapshot` to another client's
path surfaces `permission-denied` in the hook's error state.

**Independently shippable.** Yes.

---

### Phase 4 — Write-back: `markReviewed` callable + ContentReview off localStorage

**Goal.** Replace localStorage review tracking with server-authoritative state keyed by opaque
`rowId`. The review bit lives in `contentReviewState` (Firestore is authoritative), and is
**mirrored best-effort back to the sheet** (columns I/J, write-only) so it's visible to whoever
opens the sheet. The mirror never feeds back into the dashboard.

**File changes.**
- `shared/types.ts` — *modify.* `ContentReviewItem.rowId: string` (required; keep `id` for React
  keys); `ContentReviewState { rowId, reviewed, reviewedAt?, reviewedBy?, reviewedByEmail?,
  updatedAt }`; `MarkReviewedRequest { agencyId, clientId, rowId, reviewed }`;
  `MarkReviewedResponse { rowId, reviewed, reviewedAt:number|null }`; add optional `AuditEvent.meta`.
- `functions/src/markReviewed.ts` — *create.* `onCall<MarkReviewedRequest>`: require `req.auth`;
  validate ids + boolean; claims check replicating rules (else `permission-denied`); batch `set`
  the state doc at `contentReviewState/{encodeURIComponent(rowId)}` (store raw `rowId` in the
  field) **+** an `auditLog` doc — the writer fills required `id` (doc id), `uid`, `action`
  (`'content.markReviewed'`/`'content.unmarkReviewed'`), `target`, `ts` (serverTimestamp), and
  `meta { rowId, reviewed }`; then fire `void mirrorReviewedToSheet(...).catch(logOnly)`
  (best-effort, non-blocking); re-read to return concrete epoch ms.
- ⚠️ **REVISED 2026-06-02 — the sheet write-back is INFEASIBLE and is dropped.** Content review
  targets roadmap deliverables, whose "Content Reviewed?"/"Who Reviewed & When" columns live on the
  "Roadmap Status" tab — a **read-only IMPORTRANGE mirror** that cannot be written (a `batchUpdate`
  into the spill area throws `#REF!` and would break Hailey's mirror). So **review state lives in
  Firestore only** (`contentReviewState`); there is **no `sheetWriteback.ts`** and no I/J mirror.
  Also: roadmap review must key off a **natural key** (Keyword + Type + month), not a minted `_rowId`
  (the roadmap has none) — a Phase 4 redesign item. The original write-back plan below is retained for
  historical context only.
- ~~`functions/src/lib/sheetWriteback.ts` — `mirrorReviewedToSheet(...)`: read the `_rowId` column,
  `batchUpdate` columns I/J by header name, best-effort write-only.~~ (Superseded — see above.)
- `functions/src/index.ts` — *modify.* **Now** add `export { markReviewed } from
  './markReviewed.js';` (the file finally exists).
- `firestore.rules` — *modify.* Inside `match /clients/{clientId}`, add `match
  /contentReviewState/{rowId} { allow read: if isPlatformAdmin() || isAgencyOf(agencyId) ||
  isClientOf(agencyId, clientId); allow write: if false; }`. **Deploy rules before the web change
  ships** or the new `onSnapshot` listener errors `permission-denied`.
- `web/src/lib/firebase.ts` — *modify.* `export const functions = getFunctions(app,
  'us-central1')` (region must match Phase 1's `us-central1`).
- `web/src/lib/contentReview.ts` — *modify.* Typed callable wrapper `markReviewed(args)` via
  `httpsCallable`. `deriveContentReview` sets `rowId: d.rowId ?? \`m${mi}-d${di}\`` — positional
  ids are render-only.
- `web/src/views/client/strategy/sections/ContentReview.tsx` — *modify.* Replace `storageKey`
  prop with `agencyId` + `clientId`; **keep `today`** (still needed for `formatRelDue`); remove
  all localStorage helpers; `onSnapshot` the `contentReviewState` collection into `stateByRow`;
  2 server states (reviewed/ready); `toggle` does optimistic update + callable + rollback;
  **items whose `rowId` is positional render read-only** (button disabled — no orphaned writes).
- `web/src/views/client/strategy/StrategyView.tsx` — *modify.* Pass `agencyId` + `clientId` to
  `<ContentReview>`; change `buildSections(doc)` → `buildSections(doc, agencyId, clientId)`
  (plain function, not a hook). **Coordinate with Phase 2's edits to this same file.**

**Human/GCP setup.** `npm --prefix functions run build` then `firebase deploy --only
functions:markReviewed,firestore:rules` (**rules first**). Emulator users need
`admin.setCustomUserClaims`.

**Verification.** Both builds pass; `grep storageKey` → no hits in ContentReview/StrategyView.
Rules: client can read `contentReviewState/*`, cannot write; unrelated client denied read. E2E:
`markReviewed({reviewed:true})` → state doc + one audit doc with required fields + `meta`;
`reviewed:false` → `reviewedAt:null` + unmark action. Negatives: wrong `clientKeys` →
`permission-denied`; unauth → `unauthenticated`; empty `rowId` → `invalid-argument`. UI: mark
persists after refresh (no localStorage); second browser live-updates; Undo reverts; clearing
localStorage changes nothing.
**Sheet mirror:** N/A — dropped (the roadmap is a read-only IMPORTRANGE mirror; review state is
Firestore-only). See the revised note in the file-changes list above.

**Independently shippable.** Yes (Firestore-only).

---

### Phase 5 — Graduate off Sheets (OPTIONAL / DEFERRED — out of v1 scope)

Once the Sheets ingest + validation gate + review write-back are stable across multiple clients,
replace the spreadsheet source of truth with a first-class in-app editor (or direct GA4/GSC API
ingest for reporting), reusing the same `validateSnapshot` gate. Revisit when (a) ≥3 clients are
live, (b) the agency edits sheets multiple times/week, or (c) GA4/GSC reporting is prioritized.
Not built in v1.

---

## Status tracker

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Ingest core (sheets client, header parsers, rowId mint, snapshot+validate) | **Done** | SA + keyless auth + APIs; parser lib + 20 tests green + tsc clean; **live read PROVEN** (5 groups/53 rows, 20 geo, 19 deliverables, 11 kpi). `_rowId` first real write **DONE on GEO** (20 ids, hidden col L, idempotent); roadmap read-only (IMPORTRANGE mirror) |
| Phase 1 — Scheduled function, Firestore config, seedClient, retire CSV path | **✅ COMPLETE + PROVEN (2026-06-02)** | `syncSheetsScheduled` live (hourly, Node 22, as SA); reworked to roadmap-read-only / GEO-only `_rowId`; first GEO write done + idempotent; Firestore snapshot **healthy** (`checkSync`: 20/20 geo rowIds, all sections); TOCTOU fix + `ignoreUndefinedProperties` retained; client seeded; SA grants self-`TokenCreator` + `datastore.user`. **No Hailey protection change needed.** Legacy CSV path **guarded, not yet deleted** (safe to delete now) |
| Phase 2 — SPA reads Firestore live | **✅ COMPLETE + DEPLOYED (2026-06-02)** | `strategyDoc.ts` (`assembleStrategyDoc`/`tsToIso`/paths) + `useClientStrategy.ts` (`onSnapshot` both docs, both-seen gate, `notFound`/`snapshotMissing`/`error`, `useAgencyClients`, `resolveAgencyId`); `ClientView`/`AgencyHome`/`StrategyView`/`Topbar` read live (switcher via `clients` prop, `canSwitch` gating preserved; **client role never opens the clients-list listener** — rules forbid it); `fixtures.ts` demoted to dev-seed-only (tree-shaken out of bundle). `seedClientFromFixture.ts` created; **ideogram seeded** (sheet-less). Both clients read back complete (`verifyPhase2.ts`). 6-dim adversarial review: 4 findings (all medium/low, **0 isolation/leak blockers**) all fixed. Builds green; **hosting deployed** (`marketing-dashboard-site.web.app`, root+deep-link 200). No rules/env change. |
| Phase 3 — Enable first `CLIENT_DOMAIN` | **✅ COMPLETE + DEPLOYED (2026-06-03)** | `neuraltrust.ai` enabled in `CLIENT_DOMAINS` (whole domain → `gmp/neuraltrust`, route-restricted). 6-dim adversarial isolation review: **`safeToShip=true`, 0 blockers, NO isolation breach** — a neuraltrust user provably reads only `gmp/neuraltrust`. Review also caught **2 high-severity go-live LOCKOUTS** (not breaches): the `/` index redirect, the `from` replay, and ClientView's BackLink all hardcoded `/agency` → 403'd a legit client. **Fixed** via shared `roleHome`/`canAccess` (`web/src/auth/roleHome.ts`), role-aware `HomeRedirect`, `from`-sanitization in SignIn, client-hidden BackLink. Plus low fix: blocking trigger writes `/users/{uid}` best-effort (claims built first) so a transient Firestore failure can't lock out a valid sign-in. Commit `30d9bab`. **Deployed** `functions,hosting` → `beforeCreateUser` + `syncSheetsScheduled` updated, hosting released; smoke-check green (root/signin/deep-link 200, served bundle matches build). **Open (human-only): walk the real sign-in matrix** with an actual @neuraltrust.ai Google account (admin/agency/client/unlisted landings + cross-slug 403) — can't be automated. |
| Phase 4 — `markReviewed` callable + ContentReview off localStorage | Not started | Deploy rules first; **sheet review mirror DROPPED** (roadmap is read-only IMPORTRANGE → review state Firestore-only); roadmap review keys off **natural key** not `_rowId` (redesign); coordinate `buildSections` w/ Phase 2 |
| Phase 5 — Graduate off Sheets | Not started | Optional / deferred |

---

## Decisions Thomas must make

1. **SA access level — DECIDED: Editor + keyless.** Minting `_rowId` (and the review write-back)
   needs the SA to be **Editor** on the sheet. One SA does both read and write, with **no
   downloadable key** — deployed functions run *as* the SA; local dev impersonates it. (Org policy
   blocks key downloads; keyless is more secure anyway.)
2. **Sync cadence — DECIDED: hourly.** Effectively free at this scale (~720 fn-runs/month vs a
   2M free tier; 1 scheduler job; Sheets API has no $ cost). Retire the legacy `refresh-data.yml`
   Action once the new sync is proven.
3. **Mirror reviews back to the sheet? — ~~DECIDED: yes, in v1~~ SUPERSEDED → DROPPED (2026-06-02).**
   The roadmap deliverables live on the "Roadmap Status" tab — a **read-only IMPORTRANGE mirror** that
   can't be written (a `batchUpdate` there throws `#REF!` and would break Hailey's mirror). Review
   state is therefore **Firestore-only**; there is no I/J mirror and no `sheetWriteback.ts`. See the
   Phase 4 section. _Original (now-void) rationale: best-effort write-only I/J via the same Editor SA,
   one-way courtesy display, never read back._
4. **When to enable `CLIENT_DOMAINS`.** Gate on: verified corporate domain confirmed, Firestore
   seeded/synced, client ready. (Kept off until Thomas has reviewed the live data himself.)
5. **Node 20 → 22 — DECIDED: bump to 22 now.** Update `firebase.json` runtime, `engines.node`,
   and `@types/node` in the same round; redeploy.

---

## Explicitly NOT doing in v1

- **No in-app strategy editor / graduating off Sheets** (Phase 5 deferred).
- **No live GA4/GSC API ingest** — reporting stays the sheet-derived `KpiReport`.
- **No second service account** — the single Editor SA does the read (and the GEO `_rowId` mint).
  (Sheet review mirror was **DROPPED** — see Decision #3 / Phase 4; review state is Firestore-only.)
- **No `syncSheetsNow` on-demand callable in v1** — schedule + CLI/emulator trigger suffices.
- **No multi-agency agencyId resolution** — `platform_admin` uses `'gmp'`; read path must still
  assert resolved agencyId == client's parent or 404. Collection-group resolution is a TODO.
- **No persisted "in progress / reading" review state** — 2-state reviewed/ready only.
- **No parallel `StrategyView` shared type** — keep the single web `StrategyDoc`.
- **No removal of the fixtures module** — demoted to dev-seed-only.
- **No retry/reconciliation layer** for the GEO `_rowId` mint race — acceptable at hourly cadence
  (the race window is per-run seconds, not the interval); document the failure mode; revisit later.
  (The "best-effort sheet mirror" this once also covered was dropped — see Decision #3.)

---

## Critique fixes applied (from the adversarial review pass)

This plan already incorporates the critic's `needs-fixes` items:
1. `refresh-data.yml`/`fetch-sheet.mjs` breakage fixed **in Phase 1, same PR** as the config edit
   (there is no "NeuralTrust leg" — it loops over all `clients/*.json`).
2. SA key gitignored **in Phase 0, before** generating it (`functions/.secret.local` was not
   covered).
3. `markReviewed` `index.ts` export **deferred to Phase 4** (file doesn't exist until then —
   would break the Phase 1 build).
4. Flat-fixture ↔ split-doc **round-trip contract pinned** (seed splits, assemble reassembles,
   ISO↔Timestamp).
5. Parity numbers corrected — **53** cluster rows; fixture `lastUpdated` is already `2026-05-13`
   and months already chronological (the defects are in `build-neuraltrust.mjs` / the raw sheet,
   not the fixture).
6. Firestore `list` rule + index verification added for `AgencyHome` and `contentReviewState`.
Plus the ordering/over-engineering cuts: seed script moved into Phase 2; all reviewState rules
kept in Phase 4; first rowId mint gated `--dry-run-no-write`; second SA cut (one Editor SA does
both); parallel `StrategyView` type dropped; explicit snapshot-missing UI state; Sheets-API error
handling folded into "fails closed"; legacy `build-neuraltrust.mjs`/`docs/*/data.json` retirement
noted.

> **Post-review overrides by Thomas (2026-05-29):** cadence set to **hourly**; **Node 22** bump
> now; sheet review write-back **re-included** in v1 (best-effort, write-only I/J, single SA) —
> reversing the critique's "cut write-back" recommendation, which was driven by avoiding a second
> SA; since we're Editor with one SA anyway, that concern is moot.
