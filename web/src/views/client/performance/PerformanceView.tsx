import type { StrategyDoc } from "@/lib/fixtures";

// TODO Phase 5: monthly performance reports from GA4 + GSC.
// Layout, metrics, and charts pending Hailey's examples.
export default function PerformanceView({ doc }: { doc: StrategyDoc }) {
  return (
    <div className="max-w-5xl mx-auto p-10 text-[var(--ink-1)]">
      <header className="mb-10">
        <h1 className="font-[var(--font-display)] text-3xl mb-2 text-[var(--ink-0)]">
          {doc.title}
        </h1>
        <p className="text-[var(--ink-2)]">Monthly performance reports</p>
      </header>
      <div className="rounded-lg border border-dashed border-[var(--edge-2)] p-10 text-center text-[var(--ink-3)]">
        Performance tab — pending GA4 + GSC integration in Phase 5.
        <br />
        Will show monthly KPI cards, top queries / pages, and trend charts.
      </div>
    </div>
  );
}
