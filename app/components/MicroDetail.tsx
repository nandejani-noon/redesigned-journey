"use client";

import {
  eventTypeMeta,
  gradeMeta,
  laneMeta,
  phases,
  type JourneyEvent,
} from "../lib/data";

export default function MicroDetail({ event, onClose }: { event: JourneyEvent; onClose: () => void }) {
  const meta = eventTypeMeta[event.type];
  const gm = gradeMeta[event.grade];
  const phase = phases.find((p) => p.key === event.phase);

  return (
    <div className="max-w-5xl mx-auto">
      {/* header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: meta.color }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
              {meta.label}
            </span>
            <span className="text-xs text-slate-400">· {gm.title} · {gm.subject}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{event.label}</h2>
        </div>
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">
          ← back to grade map
        </button>
      </div>

      {/* meta strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Calendar week" value={`wk ${event.week}`} sub={phase?.label} />
        <Stat label="Phase months" value={phase?.months ?? "—"} sub={phase?.dead ? "dead zone" : "working"} />
        <Stat label="Semester" value={`S${event.semester}`} sub={event.semester === 1 ? "Aug–Dec" : "Jan–Jun"} />
        <Stat label="Covers" value={event.covers ?? "—"} small />
      </div>

      {/* description */}
      <p className="text-sm text-slate-600 leading-relaxed mb-6">{event.detail}</p>

      {/* branch implications */}
      {event.branch && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["club", "onTrack", "recovery"] as const).map((k) => (
            <div key={k} className="p-3 rounded-lg border" style={{ borderColor: laneMeta[k].color }}>
              <div className="text-xs font-bold mb-1" style={{ color: laneMeta[k].color }}>{laneMeta[k].label}</div>
              <div className="text-xs text-slate-600 leading-snug">{laneMeta[k].desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-white">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-bold text-slate-800 ${small ? "text-xs leading-tight mt-1" : "text-lg"}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}
