import type { StrategyDoc } from "@/lib/fixtures";
import type { KpiObjective, KpiReport } from "@shared/types";

// Temporary KPI "Reporting" view, rendered from the sheet's KPI tracker until
// the GA4/GSC API integration lands (Phase 5). Falls back to a placeholder when
// a client has no KPI data yet.
export default function ReportingView({ doc }: { doc: StrategyDoc }) {
  const kpi = doc.kpi;

  return (
    <div className="max-w-5xl mx-auto p-10 text-[var(--ink-1)]">
      <header className="mb-10">
        <h1 className="font-[var(--font-display)] text-3xl mb-2 text-[var(--ink-0)]">
          {doc.title}
        </h1>
        <p className="text-[var(--ink-2)]">Performance &amp; KPI reporting</p>
      </header>

      {!kpi ? (
        <div className="rounded-lg border border-dashed border-[var(--edge-2)] p-10 text-center text-[var(--ink-3)]">
          Reporting will appear here once baselines and targets are set.
        </div>
      ) : (
        <>
          {kpi.targets.length > 0 && <TargetsTable targets={kpi.targets} />}
          {kpi.objectives.length > 0 && <ObjectivesTables objectives={kpi.objectives} />}
        </>
      )}
    </div>
  );
}

function TargetsTable({ targets }: { targets: KpiReport["targets"] }) {
  return (
    <section className="mb-12">
      <h2 className="font-[var(--font-display)] text-xl mb-1 text-[var(--ink-0)]">
        Targets
      </h2>
      <p className="text-[var(--ink-3)] text-sm mb-4">
        Where we're starting and where we're headed over the engagement.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--edge-1)]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[var(--ink-2)] bg-[var(--bg-card)]">
              <th className="px-4 py-3 font-medium">KPI</th>
              <th className="px-4 py-3 font-medium text-right">Baseline</th>
              <th className="px-4 py-3 font-medium text-right">Month 3</th>
              <th className="px-4 py-3 font-medium text-right">Month 6</th>
              <th className="px-4 py-3 font-medium text-right">Month 12</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.kpi} className="border-t border-[var(--edge-1)] align-top">
                <td className="px-4 py-3">
                  <div className="text-[var(--ink-0)] font-medium">{t.kpi}</div>
                  {t.description && (
                    <div className="text-[var(--ink-3)] text-xs mt-1">{t.description}</div>
                  )}
                  {t.notes && (
                    <div className="text-[var(--ink-3)] text-xs mt-1 italic">{t.notes}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-[var(--font-mono)] text-[var(--ink-2)]">
                  {t.baseline || "—"}
                </td>
                <td className="px-4 py-3 text-right font-[var(--font-mono)] text-[var(--ink-1)]">
                  {t.m3 || "—"}
                </td>
                <td className="px-4 py-3 text-right font-[var(--font-mono)] text-[var(--ink-1)]">
                  {t.m6 || "—"}
                </td>
                <td className="px-4 py-3 text-right font-[var(--font-mono)] text-[var(--ink-0)] font-semibold">
                  {t.m12 || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ObjectivesTables({ objectives }: { objectives: KpiObjective[] }) {
  // Group rows by funnel stage (Visibility / Traffic / Conversions + Revenue),
  // preserving first-seen order.
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
    <section>
      <h2 className="font-[var(--font-display)] text-xl mb-1 text-[var(--ink-0)]">
        Baselines &amp; tracking
      </h2>
      {objective && (
        <p className="text-[var(--ink-3)] text-sm mb-4">
          Business objective: <span className="text-[var(--ink-2)]">{objective}</span>
        </p>
      )}
      <div className="space-y-6">
        {order.map((funnel) => (
          <div key={funnel} className="rounded-lg border border-[var(--edge-1)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--bg-card)] text-[var(--ink-1)] text-sm font-medium border-b border-[var(--edge-1)]">
              {funnel}
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-[var(--ink-3)] text-xs">
                  <th className="px-4 py-2 font-medium">KPI</th>
                  <th className="px-4 py-2 font-medium text-right">Baseline</th>
                  <th className="px-4 py-2 font-medium">As of</th>
                  <th className="px-4 py-2 font-medium">Tracking tool</th>
                </tr>
              </thead>
              <tbody>
                {byFunnel.get(funnel)!.map((o) => (
                  <tr key={o.kpi} className="border-t border-[var(--edge-1)]">
                    <td className="px-4 py-2.5 text-[var(--ink-1)]">{o.kpi}</td>
                    <td className="px-4 py-2.5 text-right font-[var(--font-mono)] text-[var(--ink-2)]">
                      {o.baseline || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--ink-3)]">{o.date || "—"}</td>
                    <td className="px-4 py-2.5 text-[var(--ink-3)]">{o.tool || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
