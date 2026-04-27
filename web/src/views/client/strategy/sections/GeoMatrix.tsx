import type { CoverageStatus, GeoTracker } from "@shared/types";

interface LeverGroup {
  id: string;
  label: string;
  members: string[];
}

// Collapse the 14 raw coverage levers into 9 grouped columns to keep the
// matrix scannable. Mirrors LEVER_GROUPS from the original docs/ideogram/app.js.
const LEVER_GROUPS: LeverGroup[] = [
  { id: "productPage", label: "Product Page", members: ["productPage"] },
  { id: "listicle", label: "Listicle", members: ["onsiteListicle"] },
  { id: "backlink", label: "Backlink", members: ["backlink"] },
  {
    id: "guestPost",
    label: "Guest Post Listicle",
    members: ["guestPostListicle", "guestPostListicle2"],
  },
  {
    id: "listicleInclusion",
    label: "Listicle Inclusion",
    members: ["listicleInclusion"],
  },
  {
    id: "redditSerp",
    label: "Reddit SERP",
    members: ["redditThreadOnSerp", "brandEndorsingComment", "linkSubreddit"],
  },
  {
    id: "redditLlms",
    label: "Reddit LLMs",
    members: [
      "redditThreadLlm",
      "brandEndorsingCommentLlm",
      "linkSubredditLlm",
    ],
  },
  { id: "linkedin", label: "LinkedIn", members: ["linkedinPulseArticle"] },
  { id: "schema", label: "Schema", members: ["schemaMarkup"] },
];

const STATUS_RANK: Record<CoverageStatus, number> = {
  done: 3,
  inProgress: 2,
  proposed: 1,
  notDone: 0,
};
const RANK_STATUS: CoverageStatus[] = ["notDone", "proposed", "inProgress", "done"];
const KEYWORD_LIMIT = 10;

export default function GeoMatrix({ geo }: { geo: GeoTracker }) {
  const topKeywords = geo.keywords.slice(0, KEYWORD_LIMIT);

  return (
    <div className="matrix-wrap">
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="kw-col">Keyword / Prompt</th>
              <th className="sv-col">SV</th>
              {LEVER_GROUPS.map((g) => (
                <th key={g.id} className="lever">
                  {g.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topKeywords.map((kw) => (
              <tr key={kw.keyword}>
                <td className="kw-col">
                  <span className="kw-name">{kw.keyword}</span>
                </td>
                <td className="sv-col">{kw.svDisplay || "—"}</td>
                {LEVER_GROUPS.map((group) => {
                  const status = mergedStatus(kw.coverage, group.members);
                  return (
                    <td key={group.id}>
                      <span
                        className={`dot ${status}`}
                        title={`${group.label} — ${statusLabel(status)}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="matrix-legend">
        {(
          [
            ["done", "Live"],
            ["inProgress", "In Progress"],
            ["proposed", "Planned"],
            ["notDone", "Not Done"],
          ] as const
        ).map(([k, label]) => (
          <span className="leg" key={k}>
            <span className={`dot ${k}`} />
            {label}
          </span>
        ))}
        <span className="note">
          For each keyword we track every lever until your bases are covered
          across search + AI.
        </span>
      </div>
    </div>
  );
}

function statusLabel(s: CoverageStatus): string {
  return (
    {
      proposed: "Planned",
      inProgress: "In Progress",
      done: "Live",
      notDone: "Not Done",
    }[s] || s
  );
}

function mergedStatus(
  coverage: Record<string, CoverageStatus>,
  memberIds: string[],
): CoverageStatus {
  let best = 0;
  for (const id of memberIds) {
    const s = coverage[id] ?? "notDone";
    const r = STATUS_RANK[s] ?? 0;
    if (r > best) best = r;
  }
  return RANK_STATUS[best];
}
