import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import type { ClientListItem } from "@/lib/strategyDoc";
import { useTheme } from "@/lib/theme";

interface TopbarProps {
  brandName: string;
  title: string;
  lastUpdated: string;
  slug: string;
  clients?: ClientListItem[];
  onToggleToc: () => void;
}

export default function Topbar({
  brandName,
  title,
  lastUpdated,
  slug,
  clients,
  onToggleToc,
}: TopbarProps) {
  const { label, stale } = renderUpdated(lastUpdated);
  const { toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { claims } = useAuth();

  // Agency + platform admins can jump between clients; clients see only theirs.
  // Options are supplied by ClientView (live from Firestore) and only fetched
  // for switch-eligible roles, so gate on both the claim and the prop.
  const canSwitch = claims?.role === "agency" || claims?.role === "platform_admin";
  const switchClients = canSwitch ? (clients ?? []) : [];

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
            <img className="logo-light" src="/assets/gmp-monogram.png" alt={brandName} />
            <img className="logo-dark" src="/assets/gmp-monogram-dark.png" alt={brandName} />
          </span>
          <span className="brand-title">{title}</span>
        </div>

        <div className="topbar-actions">
          {switchClients.length > 1 && (
            <select
              className="client-switcher"
              value={slug}
              onChange={(e) => navigate(`/agency/clients/${e.target.value}`)}
              aria-label="Switch client"
            >
              {switchClients.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {shortName(c.title)}
                </option>
              ))}
            </select>
          )}
          <span className={"updated" + (stale ? " stale" : "")} title={lastUpdated}>
            {label}
          </span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light/dark theme"
            title="Toggle light/dark theme"
          >
            <svg
              className="icon-moon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <svg
              className="icon-sun"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function shortName(title: string): string {
  return title.split("—")[0].trim() || title;
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
