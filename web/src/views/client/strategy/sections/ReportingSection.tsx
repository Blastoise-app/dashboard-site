import type { KpiObjective, KpiReport } from "@shared/types";

// Temporary KPI "Reporting" section, rendered from the sheet's KPI tracker until
// the GA4/GSC API integration lands. Lives inline in the single-scroll page.
export default function ReportingSection({ kpi }: { kpi: KpiReport }) {
  return (
    <>
      <p className="section-intro">
        Where we're starting and where we're headed — baselines today and the targets we're
        driving toward across the engagement.
      </p>
      {kpi.targets.length > 0 && <TargetsTable targets={kpi.targets} />}
      {kpi.objectives.length > 0 && <ObjectivesTables objectives={kpi.objectives} />}
    </>
  );
}

function TargetsTable({ targets }: { targets: KpiReport["targets"] }) {
  return (
    <div className="rep-table-wrap" style={{ marginBottom: 28 }}>
      <div className="cluster-table">
        <table>
          <thead>
            <tr>
              <th>KPI</th>
              <th className="num">Baseline</th>
              <th className="num">Month 3</th>
              <th className="num">Month 6</th>
              <th className="num">Month 12</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.kpi}>
                <td>
                  <div style={{ color: "var(--ink-0)", fontWeight: 600 }}>{t.kpi}</div>
                  {t.description && (
                    <div style={{ color: "var(--ink-3)", fontSize: "12px", marginTop: 2 }}>
                      {t.description}
                    </div>
                  )}
                  {t.notes && (
                    <div
                      style={{
                        color: "var(--ink-3)",
                        fontSize: "12px",
                        marginTop: 2,
                        fontStyle: "italic",
                      }}
                    >
                      {t.notes}
                    </div>
                  )}
                </td>
                <td className="num" style={{ color: "var(--ink-2)" }}>{t.baseline || "—"}</td>
                <td className="num">{t.m3 || "—"}</td>
                <td className="num">{t.m6 || "—"}</td>
                <td className="num" style={{ color: "var(--ink-0)", fontWeight: 700 }}>
                  {t.m12 || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ObjectivesTables({ objectives }: { objectives: KpiObjective[] }) {
  const order: string[] = [];
  const byFunnel = new Map<string, KpiObjective[]>();
  for (const o of objectives) {
    const key = o.funnel || "Other";
    if (!byFunnel.has(key)) {
      order.push(key);
      byFunnel.set(key, []);
    }
    byFunnel.get(key)!.push(o);
  }
  const objective = objectives.find((o) => o.objective)?.objective;

  return (
    <div>
      {objective && (
        <p className="section-intro" style={{ marginBottom: 16 }}>
          Business objective: <span style={{ color: "var(--ink-1)" }}>{objective}</span>
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {order.map((funnel) => (
          <div key={funnel} className="cluster-table">
            <h3>{funnel}</h3>
            <table>
              <thead>
                <tr>
                  <th>KPI</th>
                  <th className="num">Baseline</th>
                  <th>As of</th>
                  <th>Tracking tool</th>
                </tr>
              </thead>
              <tbody>
                {byFunnel.get(funnel)!.map((o) => (
                  <tr key={o.kpi}>
                    <td style={{ color: "var(--ink-1)" }}>{o.kpi}</td>
                    <td className="num" style={{ color: "var(--ink-2)" }}>{o.baseline || "—"}</td>
                    <td style={{ color: "var(--ink-3)" }}>{o.date || "—"}</td>
                    <td style={{ color: "var(--ink-3)" }}>{o.tool || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
