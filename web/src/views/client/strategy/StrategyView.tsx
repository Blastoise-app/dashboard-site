import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { StrategyDoc } from "@/lib/fixtures";
import type { ClientListItem } from "@/lib/strategyDoc";
import { deriveContentReview } from "@/lib/contentReview";
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
import ReportingSection from "./sections/ReportingSection";
import ContentReview from "./sections/ContentReview";
import FinalCta from "./sections/FinalCta";

interface SectionDef {
  id: string;
  num: string;
  title: string;
  gated?: boolean;
  render: () => ReactNode;
}

export default function StrategyView({
  doc,
  clients,
}: {
  doc: StrategyDoc;
  clients?: ClientListItem[];
}) {
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

  const rootClass = tocHidden ? "toc-hidden" : "";

  return (
    <div ref={containerRef} className={rootClass || undefined} data-strategy-root>
      <Topbar
        brandName={doc.brand.name}
        title={doc.title}
        lastUpdated={doc.lastUpdated}
        slug={doc.slug}
        clients={clients}
        onToggleToc={() => setTocHidden((v) => !v)}
      />
      <div className="layout">
        {!tocHidden && (
          <TocSidebar
            entries={sections.map(({ id, num, title, gated }) => ({
              id,
              num,
              title,
              engagementGated: gated,
            }))}
            activeId={activeId}
          />
        )}
        <main className="container">
          <Hero
            title={doc.title}
            subtitle={doc.subtitle}
            eyebrow={`Strategy Brief · ${formatDateMonth(doc.lastUpdated)}`}
            sections={sections.map(({ id, title }) => ({ id, title }))}
          />
          {sections.map((s) => (
            <Section
              key={s.id}
              id={s.id}
              num={s.num}
              title={s.title}
              className={s.gated ? "engagement-gated" : undefined}
            >
              {s.render()}
            </Section>
          ))}
          <FinalCta clientName={shortName(doc.title)} />
        </main>
      </div>
    </div>
  );
}

function buildSections(doc: StrategyDoc): SectionDef[] {
  const list: SectionDef[] = [];
  let n = 0;
  const overviewSections = doc.overview?.sections ?? [];
  const byTitle = (re: RegExp) => overviewSections.find((s) => re.test(s.title));
  const byKind = <K extends string>(kind: K) =>
    overviewSections.find((s) => s.kind === kind);

  const push = (
    title: string,
    render: () => ReactNode,
    opts: { gated?: boolean } = {},
  ) => {
    const num = String(++n).padStart(2, "0");
    list.push({ id: `sec-${num}`, num, title, render, gated: opts.gated });
  };

  const opportunity = byTitle(/THE OPPORTUNITY/i);
  if (opportunity && opportunity.kind === "prose") {
    push("The Opportunity", () => <ProseSection body={opportunity.body} />);
  }

  const approach = byKind("approach");
  if (approach && approach.kind === "approach") {
    push("Our Approach", () => (
      <ApproachGrid intro={approach.intro} bullets={approach.bullets} />
    ));
  }

  if (doc.clusters?.groups?.length) {
    push("Keyword Universe", () => (
      <>
        <p className="section-intro">
          Every target keyword plotted by difficulty vs. search volume. Bigger, lower-left
          means easier to rank with larger payoff.
        </p>
        <ClustersChart clusters={doc.clusters} />
      </>
    ));
    push("Keyword Clusters", () => (
      <>
        <p className="section-intro">
          Full keyword universe grouped into clusters, sorted by search volume. KD pills flag
          keywords by how hard they are to rank.
        </p>
        <ClustersTables clusters={doc.clusters} />
      </>
    ));
  }

  if (doc.geoTracker?.keywords?.length) {
    push("Keyword Tracker", () => (
      <>
        <p className="section-intro">
          Priority keywords × grouped SEO and GEO levers. Every cell shows whether we plan to
          activate that surface for that keyword — the at-a-glance picture of where you'll show
          up across search + AI.
        </p>
        <GeoMatrix geo={doc.geoTracker} />
      </>
    ));
  }

  if (doc.roadmap?.months?.length) {
    push("Monthly Roadmap", () => (
      <>
        <p className="section-intro">
          Every deliverable across the engagement, month by month — with credit cost, target
          keyword, and current production status.
        </p>
        <RoadmapTimeline roadmap={doc.roadmap} />
      </>
    ));
  }

  // Content review — drafts/outlines awaiting sign-off (engagement-gated).
  const crItems = doc.contentReview ?? deriveContentReview(doc.roadmap);
  push(
    "Content Review",
    () => (
      <ContentReview
        items={crItems}
        today={doc.lastUpdated}
        storageKey={`cr-content-review-v1:${doc.slug}`}
      />
    ),
    { gated: true },
  );

  // Temporary KPI reporting (engagement-gated).
  if (doc.kpi) {
    const kpi = doc.kpi;
    push("Reporting", () => <ReportingSection kpi={kpi} />, { gated: true });
  }

  const credits = byKind("creditSystem");
  if (credits && credits.kind === "creditSystem") {
    push("The Credit System", () => (
      <CreditsTable intro={credits.intro} rows={credits.rows} />
    ));
  }

  return list;
}

function shortName(title: string): string {
  return title.split("—")[0].trim() || title;
}

function formatDateMonth(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
