interface TocEntry {
  id: string;
  num: string;
  title: string;
}

interface Props {
  entries: TocEntry[];
  activeId?: string;
}

export default function TocSidebar({ entries, activeId }: Props) {
  return (
    <aside className="toc-sidebar" aria-label="Contents">
      <div className="toc-label">Contents</div>
      <nav className="toc-nav">
        {entries.map((e) => (
          <a
            key={e.id}
            href={`#${e.id}`}
            data-id={e.id}
            className={e.id === activeId ? "active" : undefined}
            onClick={(ev) => {
              ev.preventDefault();
              const target = document.getElementById(e.id);
              if (target) {
                const top =
                  target.getBoundingClientRect().top + window.scrollY - 76;
                window.scrollTo({ top, behavior: "smooth" });
                history.replaceState(null, "", `#${e.id}`);
              }
            }}
          >
            <span className="toc-num">{e.num}</span>
            <span className="toc-text">{e.title}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
