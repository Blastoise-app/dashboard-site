# dashboard-site

Live, auto-refreshing client strategy microsites rendered from Google Sheets and served on GitHub Pages.

## How it works

```
Google Sheet (public, shared "anyone with link")
        │  CSV export per tab
        ▼
GitHub Actions (cron every 4 hours + manual dispatch)
  1. node scripts/fetch-sheet.mjs <slug>
  2. parse each tab → docs/<slug>/data.json
  3. git commit + push
        │
        ▼
GitHub Pages (main / /docs)
        │
        ▼
https://<org>.github.io/dashboard-site/<slug>/
  index.html + styles.css + app.js (static)
  data.json (refreshed by the workflow, fetched at page load)
```

The HTML is static. Only `data.json` changes between refreshes.

## Repo layout

```
.
├── .github/workflows/refresh-data.yml   # cron + workflow_dispatch
├── clients/
│   └── <slug>.json                      # per-client config
├── scripts/
│   ├── fetch-sheet.mjs                  # orchestrator
│   └── lib/
│       ├── parse-overview.mjs
│       ├── parse-clusters.mjs
│       ├── parse-geo-tracker.mjs
│       ├── parse-roadmap.mjs
│       └── util.mjs
├── docs/                                # served by GitHub Pages
│   ├── index.html                       # landing / client list
│   └── <slug>/
│       ├── index.html
│       ├── styles.css
│       ├── app.js
│       ├── data.json                    # rewritten by the workflow
│       └── last-updated.txt
└── package.json
```

## One-time setup

1. **GitHub Pages** — Repo → Settings → Pages → *Build and deployment* → Source: **Deploy from a branch**, Branch: **main**, Folder: **/docs**.
2. **Actions permissions** — Repo → Settings → Actions → General → *Workflow permissions* → **Read and write**.
3. **Share each client's sheet** — File → Share → "Anyone with the link — Viewer". No service account needed.

## Add a new client

1. Get the sheet's file ID from its URL: `docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.
2. Open each tab you want rendered and grab the `gid=` from the URL bar.
3. Create `clients/<slug>.json`:

   ```json
   {
     "slug": "acme",
     "title": "Acme Co. — Strategy",
     "subtitle": "Prepared by Growth Marketing Pro · 2026",
     "brand": { "name": "Growth Marketing Pro", "chipBg": "#151D29" },
     "sheetId": "<SHEET_ID>",
     "tabs": {
       "overview":   { "gid": "<gid>" },
       "clusters":   { "gid": "<gid>" },
       "geoTracker": { "gid": "<gid>" },
       "roadmap":    { "gid": "<gid>" }
     }
   }
   ```

4. Copy `docs/ideogram/` to `docs/<slug>/` (keeps the same `index.html`/`styles.css`/`app.js` — they fetch `./data.json` relative to themselves).
5. Add the client to `docs/index.html`.
6. Run locally: `node scripts/fetch-sheet.mjs <slug>` and confirm the generated `data.json`.
7. Commit and push. The workflow will keep it refreshed on schedule.

> Tabs are optional. The fetcher only runs parsers for keys present in the config. Missing tabs render nothing on the page without error.

## Local development

```sh
npm install
node scripts/fetch-sheet.mjs ideogram    # pulls the live sheet, writes data.json
npm run serve                             # http://localhost:8000/ideogram/
```

## Design language

The microsite inherits the DM Sans + DM Mono typographic system, token set, and hairline-border components from [`tack-proposal`](https://blastoise-app.github.io/mini-sites/tack-proposal/). Light and dark modes both supported via `prefers-color-scheme`.

## Refresh cadence

`cron: "0 */4 * * *"` — every 4 hours (6 runs/day). Adjust in `.github/workflows/refresh-data.yml`. GitHub Actions' practical cron floor is ~15 minutes (`*/15 * * * *`). The workflow only commits when the generated `data.json` actually changes.
