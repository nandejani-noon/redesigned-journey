"use client";

import { useState } from "react";
import {
  type Grade,
  type WeekDay,
  eocCycle,
  MASTERY_COLOR,
} from "../lib/data";

const EOC_COLOR = "#2563eb";   // matches the blue Section-exam (EOC) circle on the journey map
const TRIP_COLOR = "#0891b2";  // reward trip after the exam
const MOMENTUM_COLOR = "#6366f1"; // matches the dashed momentum line on the journey map

type CellKind =
  | "concept" | "marathon" | "teamex" | "teamcomp" | "review"
  | "independent" | "roundup" | "mastery" | "exam" | "fun" | "funcareer" | "relax";
const cellColor: Record<CellKind, string> = {
  concept: "#2563eb",
  marathon: "#1e40af",
  teamex: "#059669",
  teamcomp: "#0d9488",
  review: "#7c3aed",
  independent: "#64748b",
  roundup: "#ea580c",
  mastery: MASTERY_COLOR,
  exam: "#dc2626",
  fun: "#f59e0b",
  funcareer: "#d97706",
  relax: "#0891b2",
};
const cellDetail: Record<CellKind, string> = {
  concept: "Direct teaching — covering the cycle's new concepts.",
  marathon: "An extended concept session — more ground covered in one sitting.",
  teamex: "Concept team exercise — students work the concepts together.",
  teamcomp: "Concept team competition — the team exercises turn competitive.",
  review: "Competitive review game over everything in the cycle.",
  independent: "Independent work — replaces the week's homework; students practise on their own.",
  roundup: "Topic round-up — consolidating the whole cycle before the exam.",
  mastery: "Combined mastery session over the week's concepts.",
  exam: "The end-of-cycle EOC exam.",
  fun: "A fun activity — the reward for the previous week.",
  funcareer: "Either a fun activity OR an educational career-path activity — the reward for the week.",
  relax: "A purely relaxing activity (not educational) to unwind after the exam.",
};

interface Cell { kind: CellKind; label: string; detail: string; }
const cell = (kind: CellKind, label: string): Cell => ({ kind, label, detail: cellDetail[kind] });

// The full 5-week × weekday matrix of the EOC cycle.
const DAYS: WeekDay[] = ["Sun", "Mon", "Tue", "Wed", "Thu"];
const MATRIX: Record<number, Record<WeekDay, Cell[]>> = {
  1: {
    Sun: [cell("fun", "Fun Activity")],
    Mon: [cell("concept", "Concept Coverage")],
    Tue: [cell("concept", "Concept Coverage")],
    Wed: [cell("concept", "Concept Coverage")],
    Thu: [cell("mastery", "Mastery"), cell("fun", "Week Activity")],
  },
  2: {
    Sun: [cell("concept", "Concept Coverage")],
    Mon: [cell("marathon", "Concept Marathon")],
    Tue: [cell("marathon", "Concept Marathon")],
    Wed: [cell("independent", "Independent Work")],
    Thu: [cell("mastery", "Mastery"), cell("funcareer", "Fun / Career Activity")],
  },
  3: {
    Sun: [cell("teamex", "Concept Team Ex")],
    Mon: [cell("teamex", "Concept Team Ex")],
    Tue: [cell("teamex", "Concept Team Ex")],
    Wed: [cell("independent", "Independent Work")],
    Thu: [cell("mastery", "Mastery"), cell("funcareer", "Fun / Career Activity")],
  },
  4: {
    Sun: [cell("teamcomp", "Concept Team Comp")],
    Mon: [cell("teamcomp", "Concept Team Comp")],
    Tue: [cell("teamcomp", "Concept Team Comp")],
    Wed: [cell("independent", "Independent Work")],
    Thu: [cell("mastery", "Mastery"), cell("funcareer", "Fun / Career Activity")],
  },
  5: {
    Sun: [cell("review", "Review Game")],
    Mon: [cell("review", "Review Game")],
    Tue: [cell("review", "Review Game")],
    Wed: [cell("roundup", "Topic Round-up")],
    Thu: [cell("exam", "EOC Exam"), cell("relax", "Relaxing Activity")],
  },
};
function weekPlan(week: number): { day: WeekDay; cells: Cell[] }[] {
  return DAYS.map((day) => ({ day, cells: MATRIX[week][day] }));
}

// Smooth a polyline with quadratic curves through the segment midpoints —
// the same curve treatment the main chart uses for its momentum line.
function smooth(co: [number, number][]) {
  if (co.length === 0) return "";
  let d = `M${co[0][0]},${co[0][1]}`;
  for (let i = 0; i < co.length - 1; i++) {
    const mx = (co[i][0] + co[i + 1][0]) / 2;
    const my = (co[i][1] + co[i + 1][1]) / 2;
    d += ` Q${co[i][0]},${co[i][1]} ${mx},${my}`;
  }
  d += ` L${co[co.length - 1][0]},${co[co.length - 1][1]}`;
  return d;
}

// Momentum is mapped over the curve zone: peak (intensity 1) near the top,
// low (intensity 0) near the bottom. Matches the dashed indigo line on the map.
const yFrac = (intensity: number) => (1 - intensity) * 0.68 + 0.16; // 0.16 (peak) .. 0.84 (low)

// ---- The weekly SMTWT cadence for a chosen week ---------------------------
function WeekCycle({ week }: { week: number }) {
  const plan = weekPlan(week);
  return (
    <div className="grid grid-cols-5 gap-2">
      {plan.map((d) => (
        <div key={d.day} className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/60 overflow-hidden">
          <div className="px-2 py-1.5 bg-slate-800 text-white text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider">{d.day}</div>
          </div>
          <div className="flex flex-col gap-1.5 p-2 grow">
            {d.cells.map((c, i) => (
              <div key={i} className="rounded-md px-2 py-1.5 text-white" style={{ background: cellColor[c.kind] }}>
                <div className="text-[11px] font-extrabold leading-tight">{c.label}</div>
                <div className="text-[9px] opacity-90 leading-tight mt-0.5">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Overview: the dashed momentum curve rising across W1–W5, then cascading
//      down into the three reward nodes (EOC exam → coins → reward trip) ------
const CURVE_H = 184;     // height of the momentum zone above the week columns
const NODE = 46;         // diameter of the cascade nodes

function Overview({ hovered, setHovered, onPick }: {
  hovered: number | null;
  setHovered: (i: number | null) => void;
  onPick: (week: number) => void;
}) {
  const n = eocCycle.length;
  // The three reward nodes — they step DOWN and to the RIGHT off the peak (the
  // EOC exam), inside the Week 5 column, following one flowing dashed line.
  const nodes = [
    { xPct: 80, cy: yFrac(1) * CURVE_H, bg: EOC_COLOR, label: "EOC", sub: "Section exam", fs: 11 },
    { xPct: 88, cy: CURVE_H * 0.55, bg: "#f59e0b", label: "$", sub: "Coins reward", fs: 18 },
    { xPct: 95, cy: CURVE_H - 24, bg: TRIP_COLOR, label: "TRIP", sub: "Reward trip", fs: 9 },
  ];

  // one continuous momentum line: weeks 1–4 rising, up to the peak (EOC), then
  // cascading down-right through the coins and trip nodes.
  const co: [number, number][] = eocCycle.slice(0, 4).map((w, i) => [((i + 0.5) / n) * 100, yFrac(w.intensity) * 100]);
  nodes.forEach((node) => co.push([node.xPct, (node.cy / CURVE_H) * 100]));

  return (
    <div className="mt-5 min-h-[460px]">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">One section-exam (EOC) cycle — exam to exam</div>
      <p className="mt-1 text-[12px] text-slate-500">
        A cycle runs from one Section exam to the next — about five weeks. Momentum builds week by week up to the exam, which pays out into the rewards. Click a week to see its day-by-day plan.
      </p>

      <div className="mt-6">
        {/* momentum curve over the five week columns, peaking at Week 5; the
            reward cascade (EOC → coins → trip) drops straight down inside it */}
        <div className="relative">
          {/* the rising dashed momentum curve, peaking at the Week 5 exam */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute left-0 top-0 z-10 w-full" height={CURVE_H}>
            <path d={smooth(co)} fill="none" stroke={MOMENTUM_COLOR} strokeWidth={2.25} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* EOC exam → coins → trip — stepping down-right off the peak, in Week 5 */}
          {nodes.map((node) => (
            <div key={node.label} className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white font-extrabold leading-none text-white shadow-md"
              style={{ left: `${node.xPct}%`, top: node.cy, width: NODE, height: NODE, background: node.bg, fontSize: node.fs }}>
              {node.label}
            </div>
          ))}

          {/* five week columns — dashed verticals run the full height (curve zone + content) */}
          <div className="grid grid-cols-5">
            {eocCycle.map((w, i) => {
              const hot = hovered === i;
              return (
                <button key={w.week} onClick={() => onPick(w.week)}
                  onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                  className={`group relative flex flex-col text-left transition ${i > 0 ? "border-l border-dashed border-slate-300" : ""} ${hot ? "bg-slate-50/80 shadow-[inset_0_0_0_2px_#1e293b]" : ""}`}>
                  {/* curve-zone spacer (the momentum line floats here) */}
                  <div style={{ height: CURVE_H }} />
                  {/* week content */}
                  <div className="relative flex grow flex-col p-3" style={{ background: hot ? undefined : `${w.bandColor}08` }}>
                    <span className="text-[12px] font-extrabold text-slate-800">Week {w.week}</span>
                    <span className="mt-1.5 self-start rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: w.bandColor }}>{w.band}</span>
                    <div className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-700">{w.headline}</div>
                    <ul className="mt-2 space-y-1">
                      {w.bullets.map((b, j) => (
                        <li key={j} className="flex gap-1.5 text-[10px] leading-snug text-slate-500">
                          <span className="text-slate-300">•</span><span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <span className="mt-auto pt-2 text-[10px] font-bold text-slate-400 group-hover:text-slate-700">View details →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EOCCycle({ onClose }: { grade: Grade; onClose: () => void }) {
  const [weekN, setWeekN] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const selected = weekN != null ? eocCycle.find((w) => w.week === weekN)! : null;

  return (
    <div className="overflow-y-auto p-5">
      {/* header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          {selected && (
            <button onClick={() => setWeekN(null)} className="text-[12px] font-semibold px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">← Cycle</button>
          )}
          <h2 className="text-2xl font-bold text-slate-800">
            EOC cycle{selected ? ` · Week ${selected.week}` : ""}
          </h2>
        </div>
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0">✕ close</button>
      </div>

      {!selected ? (
        <Overview hovered={hovered} setHovered={setHovered} onPick={setWeekN} />
      ) : (
        <>
          {/* selected-week banner */}
          <div className="mt-5 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5">
            <span className="rounded px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: selected.bandColor }}>{selected.band}</span>
            <span className="text-[13px] font-semibold text-slate-700">{selected.headline}</span>
          </div>

          {/* post-EOC redemption event — spans the whole week after the exam */}
          {selected.week === 1 && (
            <div className="mt-4 flex items-center gap-3 rounded-lg px-4 py-3 text-white" style={{ background: "#f59e0b" }}>
              <span className="text-xl leading-none">🎟️</span>
              <div>
                <div className="text-[13px] font-extrabold leading-tight">Redemption event — all week</div>
                <div className="text-[11px] opacity-90 leading-tight mt-0.5">The week after the EOC is one long redemption event — students spend their coins on rewards. It rewards effort, not grades.</div>
              </div>
            </div>
          )}

          <div className="mt-4 min-h-[420px]">
            <WeekCycle week={selected.week} />
          </div>

          {/* post-exam reward trip */}
          {selected.week === 5 && (
            <div className="mt-3 flex items-center gap-3 rounded-lg px-4 py-3 text-white" style={{ background: TRIP_COLOR }}>
              <span className="text-xl leading-none">🏝️</span>
              <div>
                <div className="text-[13px] font-extrabold leading-tight">Reward trip</div>
                <div className="text-[11px] opacity-90 leading-tight mt-0.5">After the exam, the student goes on a celebration trip — the reward that closes the cycle before the next one begins.</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
