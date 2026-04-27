interface TopbarProps {
  brandName: string;
  title: string;
  lastUpdated: string;
  onToggleToc: () => void;
}

export default function Topbar({
  brandName,
  title,
  lastUpdated,
  onToggleToc,
}: TopbarProps) {
  const initials = computeInitials(brandName);
  const { label, stale } = renderUpdated(lastUpdated);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <button
            className="toc-toggle"
            onClick={onToggleToc}
            aria-label="Toggle contents"
            title="Toggle contents"
          >
            <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="brand-logo">
            <svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0 L2 18 H11 L9 32 L22 12 H13 Z" />
            </svg>
            {initials}
          </span>
          <span className="brand-title">{title}</span>
        </div>
        <span className={"updated" + (stale ? " stale" : "")} title={lastUpdated}>
          {label}
        </span>
      </div>
    </header>
  );
}

function computeInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function renderUpdated(iso: string): { label: string; stale: boolean } {
  if (!iso) return { label: "Updated —", stale: false };
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  return {
    label: `Updated ${relativeTime(diff)}`,
    stale: diff > 12 * 3600 * 1000,
  };
}

function relativeTime(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
