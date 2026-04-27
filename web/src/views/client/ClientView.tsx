import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getFixture } from "@/lib/fixtures";
import StrategyView from "./strategy/StrategyView";
import PerformanceView from "./performance/PerformanceView";

type Tab = "strategy" | "performance";

export default function ClientView() {
  const { slug = "" } = useParams();
  const doc = getFixture(slug);
  const [tab, setTab] = useState<Tab>("strategy");

  if (!doc) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--bg-page)] text-[var(--ink-2)]">
        <div className="text-center">
          <p className="mb-4">Client not found: {slug}</p>
          <Link to="/agency" className="text-[var(--red)] underline">
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Tabs current={tab} onChange={setTab} />
      {tab === "strategy" ? (
        <StrategyView doc={doc} />
      ) : (
        <PerformanceView doc={doc} />
      )}
    </div>
  );
}

function Tabs({
  current,
  onChange,
}: {
  current: Tab;
  onChange: (t: Tab) => void;
}) {
  const items: Array<{ id: Tab; label: string }> = [
    { id: "strategy", label: "Strategy" },
    { id: "performance", label: "Performance" },
  ];
  return (
    <div className="sticky top-0 z-[60] flex justify-center gap-1 border-b border-[var(--edge-1)] bg-[var(--bg-page)]/85 backdrop-blur">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={
            "px-5 py-3 text-sm font-medium font-[var(--font-sans)] border-b-2 -mb-px transition-colors " +
            (current === item.id
              ? "text-[var(--ink-0)] border-[var(--red)]"
              : "text-[var(--ink-2)] border-transparent hover:text-[var(--ink-0)]")
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
