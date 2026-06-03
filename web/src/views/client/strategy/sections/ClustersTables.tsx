import { useState } from "react";
import type { Clusters } from "@shared/types";

// Collapse long cluster tables to a preview so one big group (e.g. a 30-keyword
// core cluster) doesn't tower over its neighbors and leave a wall of whitespace.
const COLLAPSE_THRESHOLD = 10;
const PREVIEW_ROWS = 8;

export default function ClustersTables({ clusters }: { clusters: Clusters }) {
  // Only show the CPC column when at least one row actually carries CPC data
  // (the Ideogram sheet does; NeuralTrust tracks only SV + KD).
  const showCpc = clusters.groups.some((g) =>
    g.rows.some((r) => r.cpcDisplay != null && r.cpcDisplay !== ""),
  );
  return (
    <div className="clusters-tables">
      {clusters.groups.map((g) => (
        <ClusterTable key={g.name} group={g} showCpc={showCpc} />
      ))}
    </div>
  );
}

function ClusterTable({
  group,
  showCpc,
}: {
  group: Clusters["groups"][number];
  showCpc: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = group.rows.slice().sort((a, b) => b.sv - a.sv);
  const collapsible = sorted.length > COLLAPSE_THRESHOLD;
  const visible = collapsible && !expanded ? sorted.slice(0, PREVIEW_ROWS) : sorted;
  const hidden = sorted.length - visible.length;

  return (
    <div className="cluster-table">
      <h3>
        <span>{group.name}</span>
        <span className="cluster-count">{group.rows.length} kw</span>
      </h3>
      <table>
        <thead>
          <tr>
            <th>Keyword</th>
            <th className="num">Volume</th>
            <th className="num">KD</th>
            {showCpc && <th className="num">CPC</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.keyword}>
              <td className="kw">{r.keyword}</td>
              <td className="num">{r.svDisplay || ""}</td>
              <td className="num">
                <span className={`kd-pill ${kdClass(r.kd)}`}>{r.kd || "—"}</span>
              </td>
              {showCpc && <td className="num">{r.cpcDisplay || "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {collapsible && (
        <button
          type="button"
          className="cluster-more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : `Show all ${sorted.length} keywords`}
          {!expanded && hidden > 0 && (
            <span className="cluster-more-count">+{hidden}</span>
          )}
        </button>
      )}
    </div>
  );
}

function kdClass(kd: number): string {
  if (!kd) return "";
  if (kd < 40) return "kd-low";
  if (kd < 75) return "kd-med";
  return "kd-high";
}
