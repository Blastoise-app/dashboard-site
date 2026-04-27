import type { Roadmap, RoadmapDeliverable } from "@shared/types";

const TYPE_DOT_COLOR: Record<string, string> = {
  "Onsite Product Page": "--data-green",
  "Onsite Blog Listicle": "--data-blue",
  "Guest Post Listicle": "--red",
  "Listicle Inclusion": "--data-slate",
  "Reddit SEO Post": "--data-orange",
  "Reddit VIRAL GROWTH Post": "--data-orange",
  "Reddit Comments": "--data-orange",
  Backlink: "--data-amber",
  "Backlink (Premium)": "--data-amber",
  "YouTube Video": "--data-purple",
  "YouTube Optimization": "--data-purple",
  Wikipedia: "--data-slate",
  "Page Refresh": "--data-teal",
  "LinkedIn Article": "--data-indigo",
};

interface Group {
  type: string;
  items: RoadmapDeliverable[];
  totalCredits: number;
  description?: string;
}

export default function RoadmapTimeline({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="timeline">
      {roadmap.months.map((month, idx) => (
        <div key={month.label}>
          <div className="phase-label">
            <span>
              Month {idx + 1} — {monthSubtitle(month.label)}
            </span>
            <span className="phase-cost">{month.totalCredits} credits</span>
          </div>
          <div className="phase">
            {groupDeliverables(month.deliverables).map((g) => (
              <Milestone group={g} key={g.type} />
            ))}
          </div>
          {idx < roadmap.months.length - 1 && <div className="phase-gap" />}
        </div>
      ))}
    </div>
  );
}

function Milestone({ group }: { group: Group }) {
  const dotVar = TYPE_DOT_COLOR[group.type] || "--data-slate";
  const colorVar = `var(${dotVar})`;
  const count = group.items.length;
  const noun = count === 1 ? "deliverable" : "deliverables";
  const desc = group.items.find((d) => d.description)?.description;
  const keywords = uniq(group.items.map((d) => d.keyword).filter(Boolean));

  return (
    <div className="ms">
      <span
        className="ms-dot"
        style={{ background: colorVar, borderColor: colorVar }}
      />
      <div className="ms-meta">
        <span className="ms-meta-count">
          {count} {noun}
        </span>
        <span
          className="ms-badge"
          style={{
            color: colorVar,
            background: `color-mix(in srgb, ${colorVar} 14%, transparent)`,
            borderColor: `color-mix(in srgb, ${colorVar} 35%, transparent)`,
          }}
        >
          {group.totalCredits} credits
        </span>
      </div>
      <div className="ms-title">{pluralizeType(group.type, count)}</div>
      {desc && <div className="ms-body">{desc}</div>}
      {keywords.length > 0 && (
        <div className="ms-deliver">
          <span className="ms-deliver-label">Keywords: </span>
          {keywords.join(" · ")}
        </div>
      )}
    </div>
  );
}

function groupDeliverables(deliverables: RoadmapDeliverable[]): Group[] {
  const order: string[] = [];
  const map = new Map<string, Group>();
  for (const d of deliverables) {
    const key = d.type || "Other";
    if (!map.has(key)) {
      order.push(key);
      map.set(key, {
        type: key,
        items: [],
        totalCredits: 0,
        description: d.description,
      });
    }
    const g = map.get(key)!;
    g.items.push(d);
    g.totalCredits += d.credits || 0;
  }
  return order.map((k) => map.get(k)!);
}

function monthSubtitle(label: string): string {
  // "MONTH 1 — May 2026" → "May 2026"
  const m = /—\s*(.+)$/.exec(label || "");
  return m ? m[1] : "";
}

function pluralizeType(type: string, count: number): string {
  if (!type) return "";
  if (count <= 1) return type;
  const parts = type.split(" ");
  const last = parts[parts.length - 1];
  if (/[^s]s$/.test(last) || /y$/.test(last)) {
    parts[parts.length - 1] = last.replace(/y$/, "ies");
  } else if (!/s$/.test(last)) {
    parts[parts.length - 1] = last + "s";
  }
  return parts.join(" ");
}

function uniq<T>(arr: T[]): T[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}
