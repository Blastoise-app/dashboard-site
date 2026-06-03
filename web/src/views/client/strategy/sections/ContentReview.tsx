import { useMemo, useState } from "react";
import type { ContentReviewItem } from "@shared/types";
import { deliverableColorVar } from "@/lib/contentReview";

type Status = "ready" | "reading" | "reviewed";
type Filter = "all" | Status;
type ItemState = { openedAt?: number; reviewedAt?: number };
type CRState = Record<string, ItemState>;

const STATUS_LABEL: Record<Status, string> = {
  ready: "Ready for review",
  reading: "In progress",
  reviewed: "Reviewed",
};

export default function ContentReview({
  items,
  today,
  storageKey,
}: {
  items: ContentReviewItem[];
  today: string;
  storageKey: string;
}) {
  const [state, setState] = useState<CRState>(() => readState(storageKey));
  const [filter, setFilter] = useState<Filter>("all");

  const statusOf = (item: ContentReviewItem): Status => {
    const s = state[item.id];
    if (s?.reviewedAt) return "reviewed";
    if (s?.openedAt) return "reading";
    return "ready";
  };

  const update = (next: CRState) => {
    setState(next);
    writeState(storageKey, next);
  };

  const counts = useMemo(() => {
    const c = { all: items.length, ready: 0, reading: 0, reviewed: 0, attn: 0, isNew: 0 };
    for (const it of items) {
      const s = statusOf(it);
      c[s]++;
      if (s !== "reviewed") c.attn++;
      if (it.isNew && s !== "reviewed") c.isNew++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, state]);

  const filtered = useMemo(() => {
    const order: Record<Status, number> = { ready: 0, reading: 1, reviewed: 2 };
    return items
      .filter((it) => (filter === "all" ? true : statusOf(it) === filter))
      .sort((a, b) => {
        const sa = order[statusOf(a)];
        const sb = order[statusOf(b)];
        if (sa !== sb) return sa - sb;
        const aNew = a.isNew && statusOf(a) !== "reviewed" ? 0 : 1;
        const bNew = b.isNew && statusOf(b) !== "reviewed" ? 0 : 1;
        if (aNew !== bNew) return aNew - bNew;
        return (a.dueBy || "").localeCompare(b.dueBy || "");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filter, state]);

  const stats = [
    { cls: "attn", num: counts.attn, label: "On your plate" },
    { cls: "in-review", num: counts.reading, label: "In progress" },
    { cls: "reviewed", num: counts.reviewed, label: "Reviewed" },
    { cls: "", num: counts.all, label: "Total pieces" },
  ];

  const filters: Array<{ id: Filter; label: string; n: number }> = [
    { id: "all", label: "All", n: counts.all },
    { id: "ready", label: "Ready", n: counts.ready },
    { id: "reading", label: "In progress", n: counts.reading },
    { id: "reviewed", label: "Reviewed", n: counts.reviewed },
  ];

  return (
    <>
      <p className="section-intro">
        Outlines and drafts ready for your eyes. Open one in Google Docs to read and leave
        comments inline — then come back here and mark it reviewed so our team knows you're done.
      </p>

      <div className="cr-summary">
        {stats.map((st) => (
          <div key={st.label} className={"cr-stat" + (st.cls ? " " + st.cls : "")}>
            <div className="cr-stat-num">{st.num}</div>
            <div className="cr-stat-label">{st.label}</div>
          </div>
        ))}
      </div>

      <div className="cr-filterbar">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={"cr-filter" + (filter === f.id ? " is-active" : "")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="cr-filter-count">{f.n}</span>
          </button>
        ))}
      </div>

      <div className="cr-list">
        {filtered.length === 0 ? (
          <div className="cr-empty">
            {filter === "reviewed"
              ? "Nothing reviewed yet — once you check items off, they'll show up here."
              : "Nothing in this bucket. Switch to All to see everything."}
          </div>
        ) : (
          filtered.map((item) => {
            const status = statusOf(item);
            const accent = `var(${deliverableColorVar(item.type)})`;
            const due = formatRelDue(item.dueBy, today);
            return (
              <div
                key={item.id}
                className="cr-item"
                data-status={status}
                data-new={item.isNew && status !== "reviewed" ? "1" : undefined}
                style={{ ["--cr-accent" as string]: accent }}
              >
                <div className="cr-body">
                  <div className="cr-meta">
                    <span className="cr-type-pill">{item.type}</span>
                    <span className="cr-kind">{item.kind || "Document"}</span>
                    {due.label && status !== "reviewed" && (
                      <>
                        <span className="cr-dot" />
                        <span className={"cr-due " + due.className}>{due.label}</span>
                      </>
                    )}
                    {item.isNew && status !== "reviewed" && (
                      <span className="cr-new-pill">New</span>
                    )}
                  </div>
                  <div className="cr-title">{item.title}</div>
                  {item.keyword && (
                    <div className="cr-sub">Target keyword: {item.keyword}</div>
                  )}
                </div>

                <div className="cr-status" data-s={status}>
                  <span className="cr-status-bullet" />
                  {STATUS_LABEL[status]}
                </div>

                <div className="cr-actions">
                  <a
                    className="cr-action cr-action-open"
                    href={item.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (statusOf(item) !== "reviewed") {
                        update({
                          ...state,
                          [item.id]: { ...state[item.id], openedAt: Date.now() },
                        });
                      }
                    }}
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2h4v4" />
                      <path d="M14 2 8 8" />
                      <path d="M12 9v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" />
                    </svg>
                    <span>Open in Google Docs</span>
                  </a>
                  {status === "reviewed" ? (
                    <button
                      type="button"
                      className="cr-action cr-action-undo"
                      onClick={() => {
                        const copy = { ...state, [item.id]: { ...state[item.id] } };
                        delete copy[item.id].reviewedAt;
                        update(copy);
                      }}
                    >
                      Undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cr-action cr-action-review"
                      onClick={() => {
                        update({
                          ...state,
                          [item.id]: { ...state[item.id], reviewedAt: Date.now() },
                        });
                      }}
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 8.5 6.5 12 13 4.5" />
                      </svg>
                      <span>Mark reviewed</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function readState(key: string): CRState {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CRState) : {};
  } catch {
    return {};
  }
}

function writeState(key: string, obj: CRState): void {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

// Relative due label, measured against the doc's "today" (lastUpdated) so it's
// stable regardless of when the page is viewed.
function formatRelDue(
  dateStr: string | undefined,
  today: string,
): { label: string; className: string } {
  if (!dateStr) return { label: "", className: "" };
  const refStr = (today || "").slice(0, 10);
  const ref = refStr ? new Date(refStr + "T00:00:00") : new Date();
  const due = new Date(dateStr + "T00:00:00");
  const days = Math.round((due.getTime() - ref.getTime()) / 86400000);
  let label: string;
  if (days < 0) label = `Overdue by ${-days}d`;
  else if (days === 0) label = "Due today";
  else if (days === 1) label = "Due tomorrow";
  else if (days < 7) label = `Due in ${days}d`;
  else label = `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  let className = "";
  if (days < 0) className = "is-overdue";
  else if (days <= 2) className = "is-soon";
  return { label, className };
}
