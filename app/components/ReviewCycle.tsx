"use client";

import { type Grade, type WeekDay } from "../lib/data";

type CellKind = "mastery" | "fix" | "simulator" | "qa" | "fun";
const cellColor: Record<CellKind, string> = {
  mastery: "#0d9488",   // combined mastery session
  fix: "#ea580c",       // fixing wrong answers — the core Strategy+ move
  simulator: "#2563eb", // exam simulator — alternates biweekly with fix-mistakes
  qa: "#7c3aed",        // aggregated Q&A with the teacher
  fun: "#f59e0b",       // fun activity reward
};

interface Cell { kind: CellKind; label: string; detail: string; }
const cell = (kind: CellKind, label: string, detail: string): Cell => ({ kind, label, detail });

// The biweekly review cycle. Mon / Wed / Thu are the same every week; Tuesday
// alternates between the "fix your mistakes" loop and an exam simulator session.
// Sunday has no session.
const fixCell = cell(
  "fix", "Fix your mistakes",
  "Students revisit the questions they got wrong, review the material (solo or in teams), then work more variations of the same questions in increasing difficulty — mixed with earlier mistakes.",
);
const simulatorCell = cell(
  "simulator", "Simulator session",
  "A full exam-simulator session, replacing fix-mistakes this week — sitting questions under exam-like conditions.",
);
function weekPlan(tue: Cell): { day: WeekDay; cells: Cell[] }[] {
  return [
    { day: "Sun", cells: [] },
    { day: "Mon", cells: [cell("mastery", "Mastery session", "Combined mastery session to open the week, consolidating the review material.")] },
    { day: "Tue", cells: [tue] },
    { day: "Wed", cells: [cell("qa", "Q&A session", "Based on how the class did, the teacher presents and works through the hardest questions together.")] },
    { day: "Thu", cells: [cell("fun", "Fun activity", "Reward: a fun activity to close the week.")] },
  ];
}
// Week 1 of the cycle runs the simulator; week 2 runs fix-mistakes.
const reviewWeeks: { title: string; plan: { day: WeekDay; cells: Cell[] }[] }[] = [
  { title: "Week 1 · Simulator", plan: weekPlan(simulatorCell) },
  { title: "Week 2 · Fix mistakes", plan: weekPlan(fixCell) },
];

export default function ReviewCycle({ onClose }: { grade: Grade; onClose: () => void }) {
  return (
    <div className="overflow-y-auto p-5">
      {/* header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: "#f97316" }}>New initiative</span>
          <h2 className="text-2xl font-bold text-slate-800">Strategy+ Course · Review week</h2>
        </div>
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0">✕ close</button>
      </div>

      {/* why this exists — the 90+ study signal that motivates the whole week */}
      <div className="mt-5 rounded-md border-l-4 px-4 py-3" style={{ borderColor: "#ea580c", background: "#fff7ed" }}>
        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#c2410c" }}>Why fixing mistakes</div>
        <p className="mt-1 text-[12px] leading-snug text-slate-700">
          From the 90+ study, the one universal signal of top performers: they go back and fix wrong answers — Grinders double the control (16% vs 8%). It's the only metric that holds across all six treated segments. This week turns that into a deliberate &ldquo;wrong answers&rdquo; loop.
        </p>
      </div>

      <div className="mt-5 min-h-[420px]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">The biweekly review cycle</div>
        <p className="text-[12px] text-slate-500 mb-3">
          Mon / Wed / Thu repeat every week. Tuesday alternates biweekly: a simulator session one week, the fix-mistakes loop the next.
        </p>

        {/* two-week (biweekly) view — same day-cell structure as the EOC week view */}
        <div className="flex flex-col gap-4">
          {reviewWeeks.map((wk) => (
            <div key={wk.title}>
              <div className="text-[11px] font-bold text-slate-600 mb-1.5">{wk.title}</div>
              <div className="grid grid-cols-5 gap-2">
                {wk.plan.map((d) => (
                  <div key={d.day} className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/60 overflow-hidden">
                    <div className="px-2 py-1.5 bg-slate-800 text-white text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider">{d.day}</div>
                    </div>
                    <div className="flex flex-col gap-1.5 p-2 grow">
                      {d.cells.length === 0 ? (
                        <div className="flex grow items-center justify-center text-[9px] font-semibold text-slate-300">No session</div>
                      ) : d.cells.map((c, i) => (
                        <div key={i} className="rounded-md px-2 py-1.5 text-white" style={{ background: cellColor[c.kind] }}>
                          <div className="text-[11px] font-extrabold leading-tight">{c.label}</div>
                          <div className="text-[9px] opacity-90 leading-tight mt-0.5">{c.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
