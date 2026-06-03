import type { ContentReviewItem, Roadmap } from "@shared/types";

// Accent color per deliverable type (CSS variable name). Mirrors the roadmap
// timeline's palette so a content item's accent matches its roadmap entry.
export const TYPE_DOT_COLOR: Record<string, string> = {
  "Onsite Product Page": "--data-green",
  "Onsite Blog Listicle": "--data-blue",
  "New Blog": "--data-blue",
  "Guest Post Listicle": "--red",
  "Listicle Inclusion": "--data-slate",
  "Reddit SEO Post": "--data-orange",
  "Reddit VIRAL GROWTH Post": "--data-orange",
  "Reddit Comments": "--data-orange",
  Backlink: "--data-amber",
  "Backlink (Premium)": "--data-amber",
  "YouTube Video": "--data-purple",
  "YouTube Optimization": "--data-purple",
  Wikipedia: "--data-slate",
  "Page Refresh": "--data-teal",
  "LinkedIn Article": "--data-indigo",
  Project: "--data-slate",
};

export function deliverableColorVar(type: string): string {
  return TYPE_DOT_COLOR[type] || "--data-slate";
}

// When a client has no explicit contentReview list, derive review items from
// roadmap deliverables that have a shared doc AND a "client reviewing" status —
// i.e. the drafts/outlines actually waiting on the client right now.
export function deriveContentReview(roadmap?: Roadmap): ContentReviewItem[] {
  if (!roadmap?.months?.length) return [];
  const items: ContentReviewItem[] = [];
  roadmap.months.forEach((m, mi) => {
    m.deliverables.forEach((d, di) => {
      if (!d.docLink) return;
      if (!/review/i.test(d.statusRaw)) return;
      const kind = /outline/i.test(d.statusRaw)
        ? "Outline"
        : /draft/i.test(d.statusRaw)
          ? "Draft"
          : "Document";
      items.push({
        id: `m${mi}-d${di}`,
        title: d.title || d.keyword,
        type: d.type,
        kind,
        keyword: d.keyword || undefined,
        docUrl: d.docLink,
        isNew: true,
      });
    });
  });
  return items;
}
