import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Clusters } from "@shared/types";

const CLUSTER_COLORS = ["--red", "--data-blue", "--data-purple"];

export default function ClustersChart({ clusters }: { clusters: Clusters }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, null, { renderer: "canvas" });
    chartRef.current = chart;

    const colors = CLUSTER_COLORS.map((v) => cssVar(v));
    const borderColor = "rgba(255,255,255,0.08)";
    const tickColor = cssVar("--ink-3");
    const bgTooltip = cssVar("--bg-card");
    const inkColor = cssVar("--ink-0");
    const ink2 = cssVar("--ink-2");

    const series = clusters.groups.map((g, idx) => ({
      name: g.name,
      type: "scatter" as const,
      data: g.rows.map((r) => ({
        value: [r.kd, r.sv] as [number, number],
        name: r.keyword,
        display: { svDisplay: r.svDisplay, kd: r.kd, cpcDisplay: r.cpcDisplay },
      })),
      symbolSize: (val: number[]) => {
        const sv = val[1];
        return Math.max(8, Math.min(44, 4 + Math.log10(Math.max(sv, 10)) * 5));
      },
      itemStyle: {
        color: colors[idx % colors.length] + "cc",
        borderColor: colors[idx % colors.length],
        borderWidth: 1,
      },
    }));

    chart.setOption({
      animationDuration: 400,
      grid: { left: 56, right: 20, top: 8, bottom: 46 },
      xAxis: {
        name: "Keyword Difficulty",
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: {
          color: tickColor,
          fontFamily: "Inter",
          fontSize: 11,
          fontWeight: 500,
        },
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: borderColor, type: "solid", width: 0.5 },
        },
        axisLabel: {
          color: tickColor,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
        },
      },
      yAxis: {
        name: "Search Volume",
        nameLocation: "middle",
        nameGap: 48,
        nameTextStyle: {
          color: tickColor,
          fontFamily: "Inter",
          fontSize: 11,
          fontWeight: 500,
        },
        type: "log",
        logBase: 10,
        min: 10,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: borderColor, type: "solid", width: 0.5 },
        },
        axisLabel: {
          color: tickColor,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          formatter: formatSv,
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: bgTooltip,
        borderColor: "rgba(255,255,255,0.12)",
        borderWidth: 0.5,
        textStyle: {
          color: inkColor,
          fontFamily: "Inter",
          fontSize: 13,
        },
        extraCssText:
          "border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,0.5);padding:10px 14px;",
        formatter: (p: { data: { display: { svDisplay: string; kd: number; cpcDisplay: string }; name: string } }) => {
          const d = p.data.display;
          return `
            <div style="font-weight:600;margin-bottom:5px;color:#fff;font-family:Inter">${escapeHtml(p.data.name)}</div>
            <div style="color:${ink2};font-family:'JetBrains Mono';font-size:11.5px">
              SV ${d.svDisplay} · KD ${d.kd} · CPC ${d.cpcDisplay || "—"}
            </div>`;
        },
      },
      series,
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [clusters]);

  return (
    <div className="chart-wrap">
      <div className="chart-legend">
        {clusters.groups.map((g, idx) => (
          <span key={g.name}>
            <span
              className="ldot"
              style={{
                background: `var(${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]})`,
              }}
            />
            {g.name}
          </span>
        ))}
      </div>
      <div id="clustersChart" ref={containerRef} />
    </div>
  );
}

function cssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function formatSv(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1e3)
    return (v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(v);
}

function escapeHtml(s: string): string {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] ?? c;
  });
}
