"use client";

import { laneInfo, laneMeta, type LaneKey } from "../lib/data";

const kindColor: Record<string, string> = {
  Independent: "#0891b2",
  Guided: "#7c3aed",
  Exam: "#dc2626",
  Social: "#16a34a",
};

export default function LaneDetail({ laneKey, onClose }: { laneKey: LaneKey; onClose: () => void }) {
  const m = laneMeta[laneKey];
  const info = laneInfo[laneKey];
  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: m.color }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: m.color }}>Grade 11 · Semester-2 lane</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{m.label}</h2>
        </div>
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">✕ close</button>
      </div>

      <div className="space-y-2 mb-5 text-sm">
        <Row label="Entered when" value={info.entry} />
        <Row label="Focus" value={info.focus} />
        <Row label="Cadence" value={info.cadence} />
      </div>

      <div className="text-sm font-bold text-slate-700 mb-2">
        {laneKey === "recovery" ? "Independent practice tasks (chosen off the heatmap)" : "Tasks in this lane"}
      </div>
      <ol className="space-y-2">
        {info.tasks.map((t, idx) => (
          <li key={t.title} className="flex gap-3 p-3 rounded-lg border border-slate-200 bg-white">
            <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0" style={{ background: m.color }}>{idx + 1}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{t.title}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${kindColor[t.kind] ?? "#475569"}1a`, color: kindColor[t.kind] ?? "#475569" }}>{t.kind}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-snug">{t.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400 pt-0.5">{label}</div>
      <div className="text-sm text-slate-600">{value}</div>
    </div>
  );
}
