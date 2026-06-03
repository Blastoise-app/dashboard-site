import type { Roadmap, RoadmapDeliverable } from "@shared/types";

// V6 roadmap: one card per month (red month badge + eyebrow/date on the left,
// deliverable + credit counts on the right) over a compact deliverable table
// (Type · Deliverable · SV · Cr · Status · Reasoning).
export default function RoadmapTimeline({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="rm-root">
      {roadmap.months.map((month, mIdx) => {
        const { num, when } = splitMonthLabel(month.label, mIdx);
        const dels = month.deliverables ?? [];
        const credits =
          month.totalCredits != null
            ? month.totalCredits
            : dels.reduce((s, d) => s + (Number(d.credits) || 0), 0);

        return (
          <div className="rm-month" key={month.label || mIdx}>
            <div className="rm-month-head">
              <div className="rm-month-headL">
                <span className="rm-month-num">{String(mIdx + 1).padStart(2, "0")}</span>
                <div>
                  <div className="rm-month-eyebrow">{num}</div>
                  {when && <div className="rm-month-when">{when}</div>}
                </div>
              </div>
              <div className="rm-month-meta">
                <span>
                  <b>{dels.length}</b> deliverables
                </span>
                <span className="rm-dot" />
                <span>
                  <b>{credits}</b> credits
                </span>
              </div>
            </div>
            <div className="rm-scroll">
              <table className="rm-table">
                <thead>
                  <tr>
                    <th className="rm-c-type">Type</th>
                    <th className="rm-c-del">Deliverable</th>
                    <th className="rm-c-sv num">SV</th>
                    <th className="rm-c-cr num">Cr</th>
                    <th className="rm-c-status">Status</th>
                    <th className="rm-c-why">Reasoning / Intent</th>
                  </tr>
                </thead>
                <tbody>
                  {dels.map((d, i) => (
                    <DeliverableRow d={d} key={`${d.type}-${d.keyword}-${i}`} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeliverableRow({ d }: { d: RoadmapDeliverable }) {
  const typeColor = rmTypeColor(d.type);
  const status = rmStatusMeta(d.statusRaw || d.status);
  const label = d.title || d.keyword || "";
  const showKw = d.keyword && d.keyword !== label;
  const why = d.rationale || d.description || "";
  const hasSv = d.searchVolume && String(d.searchVolume).trim() !== "";
  const hasCr = d.credits != null && String(d.credits) !== "";

  return (
    <tr>
      <td className="rm-c-type">
        <span className="rm-pill" style={{ ["--p" as string]: typeColor }}>
          {d.type || "—"}
        </span>
      </td>
      <td className="rm-c-del">
        <span className="rm-del-kw">{label}</span>
        {showKw && <span className="rm-del-meta">{d.keyword}</span>}
      </td>
      <td className="rm-c-sv num">
        {hasSv ? d.searchVolume : <span className="rm-muted">—</span>}
      </td>
      <td className="rm-c-cr num">
        {hasCr ? d.credits : <span className="rm-muted">—</span>}
      </td>
      <td className="rm-c-status">
        <span className="rm-status" style={{ ["--p" as string]: status.color }}>
          <span className="rm-status-dot" />
          {d.statusRaw || status.label}
        </span>
      </td>
      <td className="rm-c-why">{why}</td>
    </tr>
  );
}

// Color-code each deliverable type by category so the plan reads at a glance.
function rmTypeColor(type: string): string {
  const t = String(type || "").toLowerCase();
  let token = "--data-slate";
  if (/product page|blog listicle|onsite|new blog|page refresh/.test(t)) token = "--data-green";
  else if (/guest post|listicle inclusion/.test(t)) token = "--data-blue";
  else if (/reddit/.test(t)) token = "--data-purple";
  else if (/youtube|video/.test(t)) token = "--data-pink";
  else if (/backlink|wikipedia|authority/.test(t)) token = "--data-teal";
  else if (/project|campaign|program/.test(t)) token = "--data-indigo";
  return `var(${token})`;
}

function rmStatusMeta(s: string): { color: string; label: string } {
  const v = String(s || "").toLowerCase();
  if (/live|done|publish|complete/.test(v)) return { color: "var(--data-green)", label: "Live" };
  if (/progress|drafting|writing|building/.test(v))
    return { color: "var(--data-amber)", label: "In Progress" };
  if (/review/.test(v)) return { color: "var(--data-orange)", label: "In Review" };
  return { color: "var(--data-slate)", label: s || "Ready to Start" };
}

function splitMonthLabel(label: string, mIdx: number): { num: string; when: string } {
  const parts = String(label || "").split(/\s*[—–-]\s*/);
  const num = (parts[0] || `Month ${mIdx + 1}`).trim();
  const when = parts.slice(1).join(" — ").trim();
  return { num, when };
}
