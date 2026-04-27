import type { Clusters } from "@shared/types";

export default function ClustersTables({ clusters }: { clusters: Clusters }) {
  return (
    <div className="clusters-tables">
      {clusters.groups.map((g) => (
        <div className="cluster-table" key={g.name}>
          <h3>{g.name}</h3>
          <table>
            <thead>
              <tr>
                <th>Keyword</th>
                <th className="num">Volume</th>
                <th className="num">KD</th>
                <th className="num">CPC</th>
              </tr>
            </thead>
            <tbody>
              {g.rows
                .slice()
                .sort((a, b) => b.sv - a.sv)
                .map((r) => (
                  <tr key={r.keyword}>
                    <td className="kw">{r.keyword}</td>
                    <td className="num">{r.svDisplay || ""}</td>
                    <td className="num">
                      <span className={`kd-pill ${kdClass(r.kd)}`}>
                        {r.kd || "—"}
                      </span>
                    </td>
                    <td className="num">{r.cpcDisplay || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function kdClass(kd: number): string {
  if (!kd) return "";
  if (kd < 40) return "kd-low";
  if (kd < 75) return "kd-med";
  return "kd-high";
}
