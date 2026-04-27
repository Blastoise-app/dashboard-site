import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StrategyDoc } from "@/lib/fixtures";
import Topbar from "./Topbar";
import TocSidebar from "./TocSidebar";
import Hero from "./Hero";
import Section from "./Section";
import ProseSection from "./sections/ProseSection";
import ApproachGrid from "./sections/ApproachGrid";
import ClustersChart from "./sections/ClustersChart";
import ClustersTables from "./sections/ClustersTables";
import GeoMatrix from "./sections/GeoMatrix";
import CreditsTable from "./sections/CreditsTable";
import RoadmapTimeline from "./sections/RoadmapTimeline";
import NavGrid from "./sections/NavGrid";
import StrategyFooter from "./sections/StrategyFooter";

interface SectionDef {
  id: string;
  num: string;
  title: string;
  render: () => ReactNode;
}

export default function StrategyView({ doc }: { doc: StrategyDoc }) {
  const sections = useMemo(() => buildSections(doc), [doc]);
  const [tocHidden, setTocHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("tocHidden") === "1";
  });
  const [activeId, setActiveId] = useState<string | undefined>(sections[0]?.id);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("tocHidden", tocHidden ? "1" : "0");
  }, [tocHidden]);

  // Scroll-spy: highlight TOC entry for the first visible section.
  useEffect(() => {
    const active = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) active.add(e.target.id);
          else active.delete(e.target.id);
        }
        const first = sections.find((s) => active.has(s.id));
        if (first) setActiveId(first.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => {
      const node = document.getElementById(s.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div
      ref={containerRef}
      className={tocHidden ? "toc-hidden" : undefined}
      data-strategy-root
    >
      <Topbar
        brandName={doc.brand.name}
        title={doc.title}
        lastUpdated={doc.lastUpdated}
        onToggleToc={() => setTocHidden((v) => !v)}
      />
      <div className="layout">
        {!tocHidden && (
          <TocSidebar
            entries={sections.map(({ id, num, title }) => ({ id, num, title }))}
            activeId={activeId}
          />
        )}
        <main className="container">
          <Hero
            title={doc.title}
            subtitle={doc.subtitle}
            eyebrow={`Strategy Brief · ${formatDateMonth(doc.lastUpdated)}`}
          />
          {sections.map((s) => (
            <Section key={s.id} id={s.id} num={s.num} title={s.title}>
              {s.render()}
            </Section>
          ))}
          <StrategyFooter text={doc.overview.footer} />
        </main>
      </div>
    </div>
  );
}

function buildSections(doc: StrategyDoc): SectionDef[] {
  const list: SectionDef[] = [];
  let n = 0;
  const next = () => String(++n).padStart(2, "0");
  const byTitle = (re: RegExp) =>
    doc.overview.sections.find((s) => re.test(s.title));
  const byKind = <K extends string>(kind: K) =>
    doc.overview.sections.find((s) => s.kind === kind);

  const opportunity = byTitle(/THE OPPORTUNITY/i);
  if (opportunity && opportunity.kind === "prose") {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "The Opportunity",
      render: () => <ProseSection body={opportunity.body} />,
    });
  }

  const approach = byKind("approach");
  if (approach && approach.kind === "approach") {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "Our Approach",
      render: () => <ApproachGrid intro={approach.intro} bullets={approach.bullets} />,
    });
  }

  if (doc.clusters?.groups?.length) {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "Keyword Universe",
      render: () => (
        <>
          <p className="section-intro">
            Every buyer keyword across the image, logo, and creative clusters —
            plotted by difficulty vs. search volume. Bigger, lower-left means easier
            to rank with larger payoff.
          </p>
          <ClustersChart clusters={doc.clusters} />
        </>
      ),
    });
  }

  if (doc.clusters?.groups?.length) {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "Keyword Clusters",
      render: () => (
        <>
          <p className="section-intro">
            Full keyword universe grouped into three clusters, sorted by search
            volume. KD pills flag keywords by how hard they are to rank.
          </p>
          <ClustersTables clusters={doc.clusters} />
        </>
      ),
    });
  }

  const strategic = byTitle(/STRATEGIC ALLOCATION/i);
  if (strategic && strategic.kind === "prose") {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "Strategic Allocation",
      render: () => <ProseSection body={strategic.body} />,
    });
  }

  if (doc.geoTracker?.keywords?.length) {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "Keyword Tracker",
      render: () => (
        <>
          <p className="section-intro">
            Top 10 priority keywords × 9 grouped SEO and GEO levers. Every cell
            shows whether we plan to activate that surface for that keyword — the
            at-a-glance picture of where Ideogram will show up.
          </p>
          <GeoMatrix geo={doc.geoTracker} />
        </>
      ),
    });
  }

  const credits = byKind("creditSystem");
  if (credits && credits.kind === "creditSystem") {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "The Credit System",
      render: () => <CreditsTable intro={credits.intro} rows={credits.rows} />,
    });
  }

  if (doc.roadmap?.months?.length) {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "Monthly Roadmap",
      render: () => (
        <>
          <p className="section-intro">
            Every deliverable across the three-month engagement, grouped by type.
            Each milestone shows the count, credit cost, and which keywords it
            covers.
          </p>
          <RoadmapTimeline roadmap={doc.roadmap} />
        </>
      ),
    });
  }

  const nav = byKind("navigation");
  if (nav && nav.kind === "navigation" && nav.items.length) {
    const id = `sec-${next()}`;
    list.push({
      id,
      num: id.slice(4),
      title: "How to Navigate",
      render: () => <NavGrid items={nav.items} />,
    });
  }

  return list;
}

function formatDateMonth(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
