"use client";

import { useState } from "react";
import {
  phases,
  gradeMeta,
  phaseCadence,
  teachingWeek,
  subjectMeta,
  HOMEWORK_COLOR,
  MASTERY_COLOR,
  IDENTITY_COLOR,
  identitySessions,
  dayOffs,
  DAYOFF_COLOR,
  EXAM_DAY,
  ROUNDUP_LABEL,
  ROUNDUP_DETAIL,
  gradeEvents,
  eventTypeMeta,
  monthTicks,
  weekRangeLabel,
  trackMeta,
  type Phase,
  type Grade,
  type Track,
  type JourneyEvent,
  type DaySession,
  type DayPlan,
  type WeekDay,
} from "../lib/data";

const WEEKS = 44;

function monthFor(week: number) {
  let label = monthTicks[0].label;
  for (const m of monthTicks) if (m.week <= week) label = m.label;
  return label;
}

function sessionColor(s: DaySession) {
  if (s.kind === "homework") return HOMEWORK_COLOR;
  if (s.kind === "mastery") return MASTERY_COLOR;
  if (s.kind === "identity") return IDENTITY_COLOR;
  return subjectMeta[s.subject!].color;
}

function sessionTag(s: DaySession) {
  if (s.kind === "homework") return s.label === ROUNDUP_LABEL ? "R" : "H";
  if (s.kind === "mastery") return "M";
  if (s.kind === "identity") return "ID";
  return subjectMeta[s.subject!].label[0];
}

function isExam(e: JourneyEvent) {
  return e.type === "diagnostic" || e.type === "waypoint";
}

// Diagnostics and section exams sit on Thursday (taking the place of mastery);
// everything else on Sunday.
function eventDay(e: JourneyEvent): WeekDay {
  return isExam(e) ? EXAM_DAY : "Sun";
}

// Sessions for a given day. In an exam week the Thursday mastery session is
// dropped (the exam takes its slot) and the Wednesday homework session becomes
// a topic roundup. The identity session is injected on the Sunday of week 0
// and the semester-2 opening week.
function daySessions(d: DayPlan, week: number, examWeek: boolean): DaySession[] {
  let sessions = d.sessions;
  if (examWeek && d.day === "Thu") sessions = sessions.filter((s) => s.kind !== "mastery");
  if (examWeek && d.day === "Wed") {
    sessions = sessions.map((s) =>
      s.kind === "homework" ? { ...s, label: ROUNDUP_LABEL, detail: ROUNDUP_DETAIL } : s,
    );
  }
  if (d.day === "Sun" && identitySessions[week]) return [identitySessions[week], ...sessions];
  return sessions;
}

function eventTag(e: JourneyEvent) {
  if (e.type === "waypoint") return e.short;        // SE1 / SE2 / SE3
  if (e.type === "diagnostic") return "Diag";
  if (e.type === "mock") return "Mock";
  if (e.type === "realAttempt") return "⭐";
  if (e.type === "tournament") return "🏆";
  return e.short;
}

export default function PhaseDetail({ grade, phase, track, initialWeek, onClose }: { grade: Grade; phase: Phase; track: Track; initialWeek?: number; onClose: () => void }) {
  const pi = phases.findIndex((p) => p.key === phase.key);
  const end = pi + 1 < phases.length ? phases[pi + 1].weekStart : WEEKS;
  const wks = end - phase.weekStart;
  const finals = !!phase.finals;       // blocked for exams — no teaching sessions
  const green = phase.weekStart >= 22;  // semester 2
  const esl = track === "english";     // ESL has its own (not-yet-defined) session structure
  const accent = finals ? "#b45309" : phase.dead ? "#dc2626" : green ? "#15803d" : "#1d4ed8";
  const tint = finals ? "#fffbeb" : phase.dead ? "#fef2f2" : green ? "#f0fdf4" : "#eff6ff";
  const borderTint = finals ? "#fde68a" : green ? "#bbf7d0" : phase.dead ? "#fecaca" : "#bfdbfe";
  const weekList = Array.from({ length: wks }, (_, k) => phase.weekStart + k);
  const cadence = phaseCadence[phase.key];
  // Qudrat owns the per-day session cadence; ESL events still show but the
  // session grid is suppressed until the ESL structure is provided.
  const teaching = !phase.dead && !finals && !esl;
  const events = gradeEvents[grade].filter((e) => e.week >= phase.weekStart && e.week < end && (e.track ?? "qudrat") === track);
  const eventsByWeek = (w: number) => events.filter((e) => e.week === w);

  const [weekOpen, setWeekOpen] = useState<number | null>(initialWeek ?? null);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: accent }}>
            {gradeMeta[grade].title} · {trackMeta[track].label} · Calendar phase — zoomed in
          </div>
          <h2 className="text-2xl font-bold text-slate-800">{phase.label}</h2>
          <div className="text-sm text-slate-500 mt-1">{weekRangeLabel(phase.weekStart, end)} · weeks {phase.weekStart}–{end} · {wks} week{wks > 1 ? "s" : ""}</div>
        </div>
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">✕ close</button>
      </div>

      {weekOpen === null ? (
        // weeks laid out left→right in a single row — scrolls horizontally if needed
        <div className="flex gap-2 overflow-x-auto pb-2">
          {weekList.map((w) => {
            const wEvents = eventsByWeek(w);
            const examWk = wEvents.some(isExam);
            return (
              <div key={w} className="flex flex-col shrink-0" style={{ width: 170 }}>
                <div className="flex items-baseline justify-between px-1 pb-0.5">
                  <span className="text-sm font-extrabold" style={{ color: accent }}>w{w}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">{monthFor(w)}</span>
                </div>
                <div className="px-1 pb-1 text-[10px] font-medium text-slate-400">{weekRangeLabel(w, w + 1)}</div>

                <button
                  onClick={() => setWeekOpen(w)}
                  className="flex-1 text-left rounded-md border p-1.5 flex flex-col gap-1 transition hover:brightness-95 hover:shadow-md cursor-pointer"
                  style={{ background: tint, borderColor: borderTint }}
                >
                  {teaching ? (
                    // horizontal day-strip — a miniature of the day-by-day view it zooms into
                    <div className="flex gap-0.5">
                      {teachingWeek.map((d) => {
                        const off = dayOffs[w]?.day === d.day ? dayOffs[w] : null;
                        const dayEvts = wEvents.filter((e) => eventDay(e) === d.day);
                        return (
                          <div key={d.day} className="flex-1 min-w-0 flex flex-col items-center gap-0.5 rounded border bg-white/50 py-1" style={{ borderColor: borderTint }}>
                            <span className="text-[8px] font-bold text-slate-400">{d.day[0]}</span>
                            {off ? (
                              <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white" style={{ background: DAYOFF_COLOR }} title={`${off.label} — ${off.detail}`}>×</span>
                            ) : (
                              <>
                                {dayEvts.map((e) => (
                                  <span key={e.id} className="px-1 h-4 rounded flex items-center text-[8px] font-bold text-white whitespace-nowrap" style={{ background: eventTypeMeta[e.type].color }} title={e.label}>
                                    {eventTag(e)}
                                  </span>
                                ))}
                                {daySessions(d, w, examWk).map((s, i) => (
                                  <span key={i} className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: sessionColor(s) }} title={s.label}>
                                    {sessionTag(s)}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : esl && !phase.dead && !finals ? (
                    // ESL session structure not yet defined — show any exams, mark the rest TBC
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center px-1 py-2">
                      {wEvents.map((e) => (
                        <span key={e.id} className="px-1.5 h-5 rounded flex items-center text-[9px] font-bold text-white" style={{ background: eventTypeMeta[e.type].color }} title={e.label}>{eventTag(e)}</span>
                      ))}
                      <span className="text-[11px] font-semibold text-slate-400">TBC</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center px-1 py-3">
                      {wEvents.map((e) => (
                        <span key={e.id} className="px-1.5 h-5 rounded flex items-center text-[9px] font-bold text-white" style={{ background: eventTypeMeta[e.type].color }} title={e.label}>{eventTag(e)}</span>
                      ))}
                      <span className="text-[11px] font-semibold" style={{ color: accent }}>{finals ? "School finals · no sessions" : esl ? "TBC" : "No teaching"}</span>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <WeekView
          week={weekOpen}
          month={monthFor(weekOpen)}
          accent={accent}
          tint={tint}
          borderTint={borderTint}
          teaching={teaching}
          esl={esl}
          deadFocus={cadence.focus}
          events={eventsByWeek(weekOpen)}
          onBack={() => setWeekOpen(null)}
        />
      )}
    </div>
  );
}

function WeekView({
  week, month, accent, tint, borderTint, teaching, esl, deadFocus, events, onBack,
}: {
  week: number;
  month: string;
  accent: string;
  tint: string;
  borderTint: string;
  teaching: boolean;
  esl: boolean;
  deadFocus: string;
  events: JourneyEvent[];
  onBack: () => void;
}) {
  const examWeek = events.some(isExam);
  return (
    <div>
      <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3">‹ all weeks</button>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-extrabold" style={{ color: accent }}>Week {week}</span>
        <span className="text-sm font-semibold text-slate-400 uppercase">{month}</span>
        <span className="text-sm font-medium text-slate-400">· {weekRangeLabel(week, week + 1)}</span>
      </div>

      {teaching ? (
        <>
          <div className="text-sm font-bold text-slate-700 mb-2">
            Day by day{examWeek ? " · the section exam takes Thursday’s mastery slot, and Wednesday becomes a topic roundup" : ""}
          </div>
          {/* days laid out left→right, consistent with the week columns */}
          <div className="grid grid-cols-5 gap-1.5">
            {teachingWeek.map((d) => {
                const dayEvents = events.filter((e) => eventDay(e) === d.day);
                const off = dayOffs[week]?.day === d.day ? dayOffs[week] : null;
                return (
                  <div key={d.day} className="flex flex-col">
                    <div className="px-1.5 pb-1 text-sm font-extrabold uppercase" style={{ color: accent }}>{d.day}</div>
                    <div className="flex-1 rounded-md border p-1.5 flex flex-col gap-1.5" style={{ background: tint, borderColor: borderTint }}>
                      {dayEvents.map((e) => (
                        <div key={e.id} className="rounded border-l-4 bg-white px-2 py-1.5 shadow-sm" style={{ borderColor: eventTypeMeta[e.type].color }}>
                          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: eventTypeMeta[e.type].color }}>{eventTypeMeta[e.type].label}</div>
                          <div className="text-xs font-bold text-slate-800 leading-tight">{e.label}</div>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{e.summary}</p>
                        </div>
                      ))}
                      {off ? (
                        <div className="rounded border-l-4 bg-white px-2 py-1.5 shadow-sm" style={{ borderColor: DAYOFF_COLOR }}>
                          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: DAYOFF_COLOR }}>Day off</div>
                          <div className="text-xs font-bold text-slate-800 leading-tight">{off.label}</div>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{off.detail}</p>
                        </div>
                      ) : daySessions(d, week, examWeek).map((s, i) => (
                        <div key={i} className="rounded bg-white/80 border border-white px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: sessionColor(s) }}>
                              {s.kind === "homework" ? (s.label === ROUNDUP_LABEL ? "Roundup" : "HW") : s.kind === "mastery" ? "Mastery" : s.kind === "identity" ? "Identity" : "Class"}
                            </span>
                            <span className="text-[11px] font-bold text-slate-700 leading-tight">{s.label}</span>
                          </div>
                          {s.detail && <p className="text-[10px] text-slate-500 leading-snug mt-1">{s.detail}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      ) : esl ? (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="rounded border-l-4 bg-white px-3 py-2 shadow-sm" style={{ borderColor: eventTypeMeta[e.type].color }}>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: eventTypeMeta[e.type].color }}>{eventTypeMeta[e.type].label}</div>
              <div className="text-sm font-bold text-slate-800 leading-tight">{e.label}</div>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">{e.summary}</p>
            </div>
          ))}
          <div className="rounded-lg border border-dashed px-3 py-3 text-sm font-semibold text-slate-400" style={{ borderColor: borderTint }}>
            ESL session structure — to be confirmed.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="rounded border-l-4 bg-white px-3 py-2 shadow-sm" style={{ borderColor: eventTypeMeta[e.type].color }}>
              <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: eventTypeMeta[e.type].color }}>{eventTypeMeta[e.type].label}</div>
              <div className="text-sm font-bold text-slate-800 leading-tight">{e.label}</div>
              <p className="text-xs text-slate-500 leading-snug mt-0.5">{e.summary}</p>
            </div>
          ))}
          <div className="rounded-lg border px-3 py-2.5 text-sm font-semibold" style={{ borderColor: borderTint, background: tint, color: accent }}>
            {deadFocus}
          </div>
        </div>
      )}
    </div>
  );
}
