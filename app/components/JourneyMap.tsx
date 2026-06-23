"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  grades as gradesBase,
  gradesEsl,
  gradesTest,
  gradeEvents,
  gradeMeta,
  phases,
  monthTicks,
  eventTypeMeta,
  momentumPoints,
  testMomentumPoints,
  semesterMood,
  semesterGoal,
  tracks as tracksBase,
  tracksEsl,
  tracksTest,
  trackMeta,
  phasesFor,
  bootcampBands,
  subjectReviewBands,
  tahsiliSubjectColor,
  g11Branches,
  g11S1Branches,
  G10_REVIEW_START,
  G11_S1_END,
  type JourneyEvent,
  type Grade,
  type Phase,
  type PhaseKey,
  type Track,
  type BranchKey,
  type S1BranchKey,
} from "../lib/data";
import EOCCycle from "./EOCCycle";
import ReviewCycle from "./ReviewCycle";

const WEEKS = 44;
const YEAR_W = 1180;     // px width of one academic year
const SUMMER_W = 96;     // px width of the summer break between years
const PAD_L = 30;        // left/right breathing room so the w0 circle isn't cropped
const STRIDE = YEAR_W + SUMMER_W;
// TOTAL_W depends on how many grades are shown (G12 only appears on /esl), so it
// is computed inside the component from the selected `grades`.
const AXIS_WEEKS = Array.from({ length: WEEKS + 1 }, (_, i) => i);   // every week

// wpx: week count → pixel width
const wpx = (wks: number) => (wks / WEEKS) * YEAR_W;
// gx is redefined inside the component (lane-aware). SemBar / MomentumSpark
// receive xOffset so they don't need module-level gx.

const HATCH_DEAD = "repeating-linear-gradient(45deg,#f8fafc,#f8fafc 7px,#e9eef4 7px,#e9eef4 12px)";
const HATCH_FINALS = "repeating-linear-gradient(45deg,#fffbeb,#fffbeb 6px,#fde68a 6px,#fde68a 11px)";
const HATCH_SUMMER = "repeating-linear-gradient(45deg,#f8fafc,#f8fafc 7px,#e9eef4 7px,#e9eef4 12px)";  // same soft-grey style as the other (dead) breaks
// "Pre mock bootcamp" band — translucent diagonal lines drawn OVER the phase
// colour so the underlying band colour still reads through.
const HATCH_BOOTCAMP = "repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(15,23,42,0.10) 6px,rgba(15,23,42,0.10) 9px)";
// "Not applicable" (track inactive this grade) — a FLAT solid fill, deliberately
// not a diagonal hatch, so it never reads as a teaching break.
const INACTIVE_FILL = "#eef1f5";

const MOM_PTS = momentumPoints();

// ---- vertical hierarchy (top -> bottom) -----------------------------------
//   Semester · Momentum · Calendar blocks (assessments plotted in) · Month · Week
const GH = 46;            // grade-title strip
const SEM_H = 50;
// 1-on-1 session marker (a small dot before each Section exam / after each mock).
const ONE_ON_ONE_COLOR = "#dc2626";
// Career session marker — the first-week 1-on-1 of each semester.
const CAREER_COLOR = "#d97706";
const MOM_H = 54;
const LANE_LABEL_H = 20;  // per-lane phase-name strip (each subject's own sections)
// Lanes can have different heights: Qudrat is tall (the G11 S2 branch split —
// 90+ Club / Strategy + — lives inside it); ESL is compact (just exam markers).
const QUDRAT_LANE_H = 392;
const ESL_LANE_H = QUDRAT_LANE_H;  // ESL lane matches the Qudrat lane height
const MONTH_H = 18;       // months strip
const AXIS_H = 34;        // week ruler (week number + a dated anchor every 3 weeks)

const SEM_TOP = GH;
const MOM_TOP = SEM_TOP + SEM_H;
const COL_TOP = MOM_TOP + MOM_H;      // calendar band (stacked subject lanes) starts here
const GRID_TOP = SEM_TOP;             // week lines run from the semester band down to the axis
// NOTE: lane heights, ASMT_H and everything derived from them (MONTH_TOP /
// AXIS_TOP / COL_H / GRID_H / TOTAL_H / laneTop / laneCenterY) depend on which
// tracks are shown, so they are computed INSIDE the component from the `tracks`
// it selects (Qudrat only, or Qudrat + ESL on the /esl route).

type Sel =
  | { kind: "branch"; grade: Grade; path: BranchKey }
  | { kind: "s1branch"; grade: Grade; path: S1BranchKey }
  | { kind: "eoc"; grade: Grade }
  | { kind: "review"; grade: Grade }
  | null;

// G11 semester-2 branch region: weeks 22 -> 44, split into two stacked paths.
const BRANCH_W0 = 22;
// G10 section-exam (EOC) anchors: EOC 1 at week 8, EOC 2 at week 16 (8-week cycles).
// The cycle between them is the clickable "EOC cycle" demo region.
const EOC1_W = 8;
const EOC2_W = 16;
const G11 = 11;

function phaseStyle(ph: Phase, grade?: Grade) {
  if (ph.finals) return { background: HATCH_FINALS, color: "#b45309" };  // blocked for exams
  if (ph.dead) return { background: HATCH_DEAD, color: "#94a3b8" };
  // G10 weeks 22-24 ("review") are still inside the active EOC cycle → keep them blue
  if (grade === 10 && ph.key === "review") return { background: "#bfdbfe", color: "#1e40af" };
  // G11's coreB block (w14–17) is a pre-attempt review → green, like a S2 review block
  if (ph.weekStart >= 22 || (grade === G11 && ph.key === "coreB")) return { background: "#bbf7d0", color: "#166534" };
  return { background: "#bfdbfe", color: "#1e40af" };
}
function phaseSpan(list: Phase[], pi: number) {
  const start = list[pi].weekStart;
  const end = pi + 1 < list.length ? list[pi + 1].weekStart : WEEKS;
  return { start, end, wks: end - start };
}
// Some assessments fall on the same / adjacent week (e.g. the end-of-S1 mock and
// the first real attempt). Events that fall on the SAME week are stacked
// VERTICALLY, centred on the lane centre-line, so e.g. the tournament + mock
// (same week) sit one above the other. Returns a px offset added to y.
const STACK_STEP = 40;  // vertical centre-to-centre — ~circle dia (44) so a same-week pair just touches
function stackOffsets(evts: JourneyEvent[]): Record<string, number> {
  const byWeek: Record<number, JourneyEvent[]> = {};
  for (const e of evts) (byWeek[e.week] ??= []).push(e);
  const off: Record<string, number> = {};
  for (const cluster of Object.values(byWeek)) {
    const start = -(STACK_STEP * (cluster.length - 1)) / 2;
    cluster.forEach((e, k) => { off[e.id] = start + k * STACK_STEP; });
  }
  return off;
}

// simplified, consistent hover labels
function eventTip(e: { type: JourneyEvent["type"]; short: string }) {
  switch (e.type) {
    case "diagnostic": return "Entry Diagnostic";
    case "waypoint": return tahsiliSubjectColor[e.short] ? `${e.short} EOC · Section Exam` : "Section Exam";
    case "mock": return "Mock Exam";
    case "tournament": return "Qudrat Tournament";
    case "realAttempt": { const m = e.short.match(/\d/); return m ? `Real Attempt ${m[0]}` : "Real Attempt"; }
    default: return eventTypeMeta[e.type].label;
  }
}

function badgeCode(e: JourneyEvent) {
  switch (e.type) {
    case "diagnostic": return "Dia";
    case "waypoint": return e.short;
    case "mock": return "Mock";
    case "realAttempt": { const m = e.short.match(/\d/); return m ? `⭐${m[0]}` : "⭐"; }
    case "tournament": return "🏆";
    default: return e.short;
  }
}

// /test circle code: short, all-caps, no numbers (EOC / DIA / MOCK / REAL / CRAM).
function testBadge(e: { type: JourneyEvent["type"]; short: string }) {
  switch (e.type) {
    case "diagnostic": return "DIA";
    case "waypoint": return tahsiliSubjectColor[e.short] ? e.short.slice(0, 4).toUpperCase() : "EOC";
    case "mock": return "MOCK";
    case "realAttempt": return "REAL";
    case "tournament": return "TOU";
    default: return e.short.toUpperCase();
  }
}

export default function JourneyMap({ showEsl = false, testMode = false }: { showEsl?: boolean; testMode?: boolean }) {
  // which subject lanes to render. The main route is Qudrat only; /esl adds the
  // compact ESL lane underneath. All lane geometry below derives from this.
  const tracks = testMode ? tracksTest : showEsl ? tracksEsl : tracksBase;
  const grades = testMode ? gradesTest : showEsl ? gradesEsl : gradesBase;
  // The primary (full-height, momentum-driven) lanes in /test: Qudrat (G10/G11)
  // plus Tahsili (G12), which mirrors the grade-10 Qudrat structure.
  const PRIMARY_TRACKS: Track[] = testMode ? ["qudrat", "tahsili"] : ["qudrat"];
  const isPrimary = (t: Track) => PRIMARY_TRACKS.includes(t);

  // In the main view G11 is split into two parallel lane columns (Level 1 entry
  // and Level 2 entry). Each shows its own full S1 path + the shared S2 branches.
  // In /test and /esl the classic single-column G11 behaviour is kept.
  interface GradeLane { grade: Grade; variant: "default" | "l1" | "l2"; title: string; levelTag?: string }
  const gradeLanes: GradeLane[] = grades.flatMap((grade): GradeLane[] =>
    (grade === G11 && !testMode && !showEsl)
      ? [
          { grade: G11, variant: "l1", title: "Grade 11", levelTag: "Level 1 entry" },
          { grade: G11, variant: "l2", title: "Grade 11", levelTag: "Level 2 entry" },
        ]
      : [{ grade, variant: "default", title: gradeMeta[grade].title, levelTag: gradeMeta[grade].levelTag }]
  );
  // x-offset per lane: no summer gap between adjacent lanes of the same grade
  const gradeLaneOffsets: number[] = gradeLanes.map((_, i): number => {
    if (i === 0) return PAD_L;
    let off = PAD_L;
    for (let j = 0; j < i; j++) {
      off += YEAR_W;
      if (gradeLanes[j].grade !== gradeLanes[j + 1].grade) off += SUMMER_W;
    }
    return off;
  });
  // lane-aware x function (shadows the removed module-level gx)
  const gx = (g: number, w: number) => gradeLaneOffsets[g] + (w / WEEKS) * YEAR_W;
  const TOTAL_W = gradeLanes.length > 0 ? gradeLaneOffsets[gradeLanes.length - 1] + YEAR_W + PAD_L : PAD_L * 2;
  const laneHeights = tracks.map((t) => (isPrimary(t) ? QUDRAT_LANE_H : ESL_LANE_H));
  const ASMT_H = laneHeights.reduce((a, b) => a + b, 0);  // subject lanes stacked, inside the blocks
  // /test drops the standalone Momentum row (it's redrawn over the Qudrat lane),
  // so the calendar band starts right after the semester band there.
  // /test drops the momentum row; keep a small gap before the calendar band so the
  // semester→Qudrat spacing matches the grade→semester spacing (both 6px).
  const semH = testMode ? 66 : SEM_H;   // /test: taller semester band so the label + goal breathe
  // /test repeats the month + week axis ABOVE the Qudrat lane as well as below, so
  // reserve a top band for it and push the lanes down by that much.
  const TOP_WEEK_H = testMode ? 20 : 0;          // slim week-label strip directly above the lanes
  const TOP_AXIS_H = testMode ? MONTH_H + TOP_WEEK_H : 0;
  const COL_TOP = (testMode ? SEM_TOP + semH + 3 : MOM_TOP + MOM_H) + TOP_AXIS_H;  // shadows the module const for /test
  const TOP_MONTH_TOP = COL_TOP - TOP_AXIS_H;   // months strip above the lanes (/test)
  const TOP_AXIS_TOP = COL_TOP - TOP_WEEK_H;     // week labels sit just above the lanes (/test)
  const MONTH_TOP = COL_TOP + ASMT_H;   // months strip, just under the lanes
  const AXIS_TOP = MONTH_TOP + MONTH_H;
  const COL_H = ASMT_H;                 // calendar band height
  const GRID_H = AXIS_TOP - SEM_TOP;    // week lines run down to the axis
  const TOTAL_H = AXIS_TOP + AXIS_H;
  const laneH = (i: number) => laneHeights[i];
  const laneTop = (i: number) => laneHeights.slice(0, i).reduce((a, b) => a + b, 0);
  const laneCenterY = (i: number) => laneTop(i) + LANE_LABEL_H + (laneH(i) - LANE_LABEL_H) / 2;

  // --- /test only: momentum curve mapped over the Qudrat lane, with the event
  // dots sitting ON the curve. None of this runs in the default (current) view.
  const CURVE_PAD = 34;  // breathing room inside the lane so the curve + dots fit
  // /test uses a grade-specific realistic curve (breaks stay low, not zero; G11
  // S2 follows the Strategy+ narrative). Cache one sampled polyline per grade.
  const testPtsFor = (grade: Grade) => testMomentumPoints(grade);
  const momentumValueAt = (pts: { week: number; value: number }[], w: number) => {
    if (w <= pts[0].week) return pts[0].value;
    for (let i = 1; i < pts.length; i++) {
      if (w <= pts[i].week) {
        const a = pts[i - 1], b = pts[i];
        const t = b.week === a.week ? 0 : (w - a.week) / (b.week - a.week);
        return a.value + t * (b.value - a.value);
      }
    }
    return pts[pts.length - 1].value;
  };
  const curveY = (i: number, value: number) => {
    const bottom = laneTop(i) + laneH(i);              // value 0 sits at the lane floor
    const top = laneTop(i) + LANE_LABEL_H + CURVE_PAD; // value 1 sits near the lane top
    return bottom - value * (bottom - top);
  };
  // /test: Strategy+ now owns the FULL Qudrat lane in G11 S2 (the 90+ Club is shown
  // as a separate "OR" deviation card, not a parallel half-lane), so the momentum
  // curve runs across the whole lane and stays continuous with G11 S1.
  const testCurveY = (track: Track, value: number) => {
    return curveY(tracks.indexOf(track), value);
  };

  const [sel, setSel] = useState<Sel>(null);
  const [markersHidden, setMarkersHidden] = useState(false); // hides all event markers on the chart
  const [origin, setOrigin] = useState("50% 50%"); // zoom-in origin, from the clicked unit
  const [shown, setShown] = useState(false);       // drives the scale-in animation
  const open = useCallback((s: Sel, ev: { clientX: number; clientY: number }) => {
    setOrigin(`${ev.clientX}px ${ev.clientY}px`);
    setSel(s);
  }, []);
  const close = useCallback(() => setSel(null), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!sel) { setShown(false); return; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [sel]);

  return (
    <div className="relative h-[100dvh] w-full flex flex-col bg-white text-slate-800">
      <main className="flex-1 overflow-auto">
        <div className="flex">
          {/* sticky left gutter — labels each horizontal band, top to bottom */}
          <div className="sticky left-0 z-[55] shrink-0 w-28 sm:w-36 bg-white border-r border-slate-200" style={{ height: TOTAL_H }}>
            <GutterLabel top={GH / 2} text="Grade" />
            <GutterLabel top={SEM_TOP + semH / 2} text="Semester" />
            {!testMode && <GutterLabel top={MOM_TOP + MOM_H / 2} text="Momentum" />}
            {tracks.map((t, i) => (
              <GutterLabel key={t} top={COL_TOP + laneCenterY(i)} text={trackMeta[t].label} />
            ))}
            <GutterLabel top={MONTH_TOP + MONTH_H / 2} text="Month" />
            <GutterLabel top={AXIS_TOP + AXIS_H / 2} text="Week" />
          </div>

          {/* the single canvas */}
          <div className="relative shrink-0" style={{ width: TOTAL_W, height: TOTAL_H }}>

            {/* calendar sections — rendered PER subject lane so sections can differ per subject */}
            <div className="absolute left-0" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W }}>
              {gradeLanes.map(({ grade }, g) =>
                tracks.map((track, ti) => {
                  if (!trackMeta[track].grades.includes(grade)) return null;
                  const list = phasesFor(track);
                  return list.map((ph, pi) => {
                    const { start, wks } = phaseSpan(list, pi);
                    const s = phaseStyle(ph, grade);
                    return (
                      <div key={`${g}-${track}-${ph.key}`}
                        className="absolute border-r-2 border-white"
                        style={{ left: gx(g, start), width: wpx(wks), top: laneTop(ti), height: laneH(ti), background: s.background, color: s.color }} />
                    );
                  });
                }),
              )}
              {/* Summer break gaps — only between lanes of DIFFERENT grades */}
              {gradeLanes.slice(0, -1).map((gl, g) => {
                if (gl.grade === gradeLanes[g + 1].grade) return null;
                return (
                  <div key={`sum-${g}`} className="absolute top-0 bottom-0 flex items-center justify-center" style={{ left: gx(g, 44), width: SUMMER_W, background: HATCH_SUMMER }}>
                    <span className="text-[9px] font-bold text-slate-400 -rotate-90 whitespace-nowrap">SUMMER BREAK</span>
                  </div>
                );
              })}
            </div>

            {/* OVERLAY — subject-lane separators + zebra tint */}
            <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W }}>
              {tracks.map((t, i) => (
                <Fragment key={t}>
                  <div className="absolute left-0 border-t border-slate-300"
                    style={{ top: laneTop(i), height: laneH(i), width: TOTAL_W }} />
                  {i % 2 === 1 && gradeLanes.map((_, g) => (
                    <div key={`zebra-${t}-${g}`} className="absolute"
                      style={{ left: gx(g, 0), width: YEAR_W, top: laneTop(i), height: laneH(i), background: "rgba(15,23,42,0.045)" }} />
                  ))}
                </Fragment>
              ))}
            </div>

            {/* OVERLAY — grey out (grade, subject) cells where the track isn't active */}
            <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W }}>
              {gradeLanes.map(({ grade }, g) =>
                tracks.map((t, i) =>
                  trackMeta[t].grades.includes(grade) ? null : (
                    <div key={`${g}-${t}`} className="absolute flex items-center justify-center"
                      style={{ left: gx(g, 0), width: YEAR_W, top: laneTop(i), height: laneH(i), background: INACTIVE_FILL }}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Not applicable</span>
                    </div>
                  ),
                ),
              )}
            </div>

            {/* OVERLAY — vertical dotted week lines */}
            <div className="absolute left-0 pointer-events-none" style={{ top: GRID_TOP, height: GRID_H, width: TOTAL_W }}>
              {gradeLanes.map((_, g) => AXIS_WEEKS.map((w) => (
                <div key={`${g}-${w}`} className="absolute top-0 bottom-0 border-l border-dashed" style={{ left: gx(g, w), borderColor: "rgba(15,23,42,0.13)" }} />
              )))}
            </div>

            {/* OVERLAY — phase labels (breaks/finals only — vertical text) */}
            <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W, zIndex: 46 }}>
              {gradeLanes.map(({ grade, variant }, g) =>
                tracks.map((track, ti) => {
                  if (!trackMeta[track].grades.includes(grade)) return null;
                  const list = phasesFor(track);
                  return (
                    <Fragment key={`${g}-${track}`}>
                      {list.map((ph, pi) => {
                        if (grade === G11 && track === "qudrat" && ph.weekStart >= BRANCH_W0 && !ph.dead && !ph.finals) return null;
                        const { start, wks } = phaseSpan(list, pi);
                        const s = phaseStyle(ph, grade);
                        const vertical = ph.dead || ph.finals;
                        if (!vertical) return null;
                        // In split G11 lanes each lane owns its full height, so centre in
                        // the lower half only in the old single-column non-split case.
                        const inOldBranch = testMode && grade === G11 && track === "qudrat" && ph.weekStart >= BRANCH_W0;
                        const labelTop = inOldBranch ? laneTop(ti) + laneH(ti) / 2 : laneTop(ti);
                        const labelH = inOldBranch ? laneH(ti) / 2 : laneH(ti);
                        return (
                          <span key={ph.key} className="absolute flex items-center justify-center"
                            style={{ left: gx(g, start), width: wpx(wks), top: labelTop, height: labelH, color: s.color }}>
                            <span className="text-[9px] font-bold leading-none whitespace-nowrap -rotate-90">{ph.short}</span>
                          </span>
                        );
                      })}
                    </Fragment>
                  );
                }),
              )}
            </div>

            {/* BAND — semester (on top of the week lines) */}
            <div className="absolute left-0 pointer-events-none" style={{ top: SEM_TOP, height: semH, width: TOTAL_W }}>
              {gradeLanes.map((gl, g) => (
                <Fragment key={`sem-${gl.grade}-${gl.variant}-${g}`}>
                  <SemBar xOffset={gradeLaneOffsets[g]} start={0} end={20} color="#475569" border={testMode ? "#0f172a" : undefined} fill="#f1f5f9" label={testMode ? "Semester 1" : "SEMESTER 1"} goal={semesterGoal[gl.grade][1]} testMode={testMode} />
                  <SemBar xOffset={gradeLaneOffsets[g]} start={22} end={44} color="#475569" border={testMode ? "#0f172a" : undefined} fill="#f1f5f9" label={testMode ? "Semester 2" : "SEMESTER 2"} goal={semesterGoal[gl.grade][2]} testMode={testMode} />
                </Fragment>
              ))}
            </div>

            {/* BAND — momentum (own block; plummets the moment a break starts).
                Dropped in /test, where the curve is redrawn over the Qudrat lane. */}
            {!testMode && (
            <div className="absolute left-0 pointer-events-none border-y border-orange-200/70" style={{ top: MOM_TOP, height: MOM_H, width: TOTAL_W, background: "#fffaf4" }}>
              {/* summer break: momentum drops to zero and reconnects to next year
                  Only shown between lanes of DIFFERENT grades (skip L1→L2 gap). */}
              {gradeLanes.slice(0, -1).map((gl, g) => {
                if (gl.grade === gradeLanes[g + 1].grade) return null; // same grade, no summer
                const TOP = 14, H = MOM_H - 20;
                const yy = (v: number) => TOP + (1 - v) * H;
                const endV = MOM_PTS[MOM_PTS.length - 1].value;
                const startV = MOM_PTS[0].value;
                const d = `M0,${yy(endV)} L0,${yy(0)} L${SUMMER_W},${yy(0)} L${SUMMER_W},${yy(startV)}`;
                return (
                  <svg key={`sum-mom-${g}`} className="absolute" style={{ left: gx(g, 44), top: 0 }} width={SUMMER_W} height={MOM_H}>
                    <path d={d} fill="none" stroke="#0d9488" strokeWidth={1.75} strokeLinejoin="round" />
                  </svg>
                );
              })}
              {gradeLanes.map((_, g) => <MomentumSpark key={g} xOffset={gradeLaneOffsets[g]} />)}
            </div>
            )}

            {/* OVERLAY — "Orientation" label on the first week of each semester */}
            <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W }}>
              {gradeLanes.map(({ grade }, g) =>
                tracks.map((track, ti) =>
                  trackMeta[track].grades.includes(grade)
                    ? [0, 22].map((w) => {
                        if (grade === 12 && track === "tahsili" && w === 22) return null;
                        // In /test's single G11 column, centre S2 orientation in the lower half.
                        // In the new split lanes each lane owns the full height.
                        const inOldBranch = testMode && grade === G11 && track === "qudrat" && w >= BRANCH_W0;
                        const top = laneTop(ti) + (inOldBranch ? LANE_LABEL_H + (laneH(ti) - LANE_LABEL_H) / 2 : 0);
                        const h = inOldBranch ? (laneH(ti) - LANE_LABEL_H) / 2 : laneH(ti);
                        return (
                          <span key={`ori-${g}-${track}-${w}`} className="absolute flex items-center justify-center text-slate-400"
                            style={{ left: gx(g, w), width: wpx(1), top, height: h }}>
                            <span className="text-[9px] font-bold leading-none whitespace-nowrap -rotate-90">Orientation</span>
                          </span>
                        );
                      })
                    : null,
                ),
              )}
            </div>

            {/* /test — momentum curve drawn OVER the Qudrat lane (the dots then sit on it).
                zIndex 44 keeps it BELOW the branch overlay (45) and the assessment
                bubbles (47) so every bubble — and its hover tooltip — sits on top of
                the line. The Strategy+ lane fill is transparent, so the line still
                shows through. pointer-events-none so branch clicks pass through. */}
            {testMode && PRIMARY_TRACKS.some((t) => tracks.includes(t)) && (
              <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W, zIndex: 44 }}>
                <svg className="absolute left-0 top-0" width={TOTAL_W} height={COL_H}>
                  {(() => {
                    // smooth a polyline with quadratic curves through the segment midpoints
                    const smooth = (co: [number, number][]) => {
                      if (co.length === 0) return "";
                      let d = `M${co[0][0]},${co[0][1]}`;
                      for (let i = 0; i < co.length - 1; i++) {
                        const mx = (co[i][0] + co[i + 1][0]) / 2;
                        const my = (co[i][1] + co[i + 1][1]) / 2;
                        d += ` Q${co[i][0]},${co[i][1]} ${mx},${my}`;
                      }
                      d += ` L${co[co.length - 1][0]},${co[co.length - 1][1]}`;
                      return d;
                    };
                    // PERSONALISATION — a rising line per grade (G12 Tahsili mirrors G10 Qudrat).
                    const persoAnchors: Record<number, { week: number; v: number }[]> = {
                      10: [{ week: 0, v: 0.05 }, { week: 22, v: 0.12 }, { week: 44, v: 0.35 }],
                      11: [{ week: 0, v: 0.45 }, { week: 22, v: 0.6 }, { week: 44, v: 0.85 }],
                      12: [{ week: 0, v: 0.05 }, { week: 22, v: 0.12 }, { week: 44, v: 0.35 }],
                    };
                    return PRIMARY_TRACKS.filter((t) => tracks.includes(t)).map((track) => {
                      const ti = tracks.indexOf(track);
                      const active = gradeLanes.map((gl, g) => ({ grade: gl.grade, g })).filter((x) => trackMeta[track].grades.includes(x.grade));

                      // MOMENTUM — one continuous line across this track's active grades
                      const momCo: [number, number][] = [];
                      active.forEach(({ grade, g }) =>
                        testPtsFor(grade).forEach((p) => momCo.push([gx(g, p.week), testCurveY(track, p.value)])),
                      );
                      const momLine = smooth(momCo);

                      const persoCo: [number, number][] = [];
                      active.forEach(({ grade, g }) =>
                        (persoAnchors[grade] ?? []).forEach((a) => persoCo.push([gx(g, a.week), curveY(ti, a.v)])),
                      );
                      const persoLine = smooth(persoCo);

                      // Grey continuation of the Qudrat line into the summer break, out to
                      // the G11 July real-attempt dot sitting in the summer strip.
                      let summerLine = "";
                      const g11i = gradeLanes.findIndex((gl) => gl.grade === G11);
                      if (track === "qudrat" && g11i >= 0) {
                        const yEnd = testCurveY("qudrat", momentumValueAt(testPtsFor(G11), WEEKS));
                        const xEnd = gx(g11i, WEEKS);
                        summerLine = `M${xEnd},${yEnd} L${xEnd + SUMMER_W / 2},${yEnd}`;
                      }
                      return (
                        <Fragment key={`mom-${track}`}>
                          {momLine && <path d={momLine} fill="none" stroke="#6366f1" strokeWidth={2.25} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />}
                          {summerLine && <path d={summerLine} fill="none" stroke="#94a3b8" strokeWidth={2.25} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />}
                          {persoLine && <path d={persoLine} fill="none" stroke="#fb923c" strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />}
                        </Fragment>
                      );
                    });
                  })()}
                </svg>
              </div>
            )}

            {/* BAND — assessments (big circles, centered in their subject lane; hover = full name) */}
            {!markersHidden && (
            <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W, zIndex: testMode ? 50 : 47 }}>
              {gradeLanes.map(({ grade, variant }, g) =>
                tracks.map((track, ti) => {
                  const laneEvents = gradeEvents[grade].filter((e) => {
                    if ((e.track ?? "qudrat") !== track) return false;
                    if (grade === G11 && track === "qudrat") {
                      // S2 is handled entirely by the branch overlay
                      if (e.week >= BRANCH_W0) return false;
                      // In the split main view, S1 branch overlays render all S1 events
                      // except the W0 diagnostic. Show only the diagnostic here.
                      if (variant !== "default") return e.type === "diagnostic";
                    }
                    return true;
                  });
                  const offsets = stackOffsets(laneEvents);
                  const center = laneCenterY(ti);
                  const onCurve = testMode && isPrimary(track);
                  return laneEvents.map((e) => {
                    // Tahsili EOCs are colour-coded per subject (matched to their S2 review band)
                    const c = (e.type === "waypoint" && tahsiliSubjectColor[e.short]) || eventTypeMeta[e.type].color;
                    const light = e.type === "tournament"; // white circle needs a coloured ring + text to stay visible
                    const ringC = e.type === "tournament" ? eventTypeMeta.mock.color : "#fff"; // tie the tournament visually to the mock
                    const D = testMode ? 30 : 44;   // /test: compact labelled circle; default: big labelled circle
                    const cl = gx(g, e.week + 0.5) - D / 2;           // centered in its week column (aligns with the w-label)
                    // /test: sit the dot centered on the momentum curve; otherwise centre it in the lane
                    const cTop = onCurve
                      ? testCurveY(track, momentumValueAt(testPtsFor(grade), e.week + 0.5)) - D / 2  // centered on the line at the same x (week+0.5)
                      : center - D / 2 + offsets[e.id];      // stacked vertically if same-week
                    const tip = eventTip(e);
                    return (
                      <div key={e.id}
                        className="group absolute pointer-events-auto cursor-default flex flex-col items-center justify-center rounded-full border-[3px] shadow-md hover:!z-[70]"
                        style={{ left: cl, top: cTop, width: D, height: D, background: c, borderColor: ringC, zIndex: 46 }}>
                        <span className={`font-extrabold leading-none ${testMode ? "text-[7px]" : "text-[11px]"}`} style={{ color: light ? eventTypeMeta.mock.color : "#fff" }}>{testMode ? testBadge(e) : badgeCode(e)}</span>
                        <Tip align={g === 0 && e.week <= 1 ? "left" : "center"}>{tip}</Tip>
                      </div>
                    );
                  });
                }),
              )}

              {/* 1-on-1 sessions — a small red dot BEFORE every Section exam
                  (prep) and AFTER every mock (results review), on the Qudrat lane. */}
              {(() => {
                const T = testMode ? 24 : 16;        // triangle marker size (matches the circles in /test)
                const S2_DIAG_W = 22; // start of semester 2 — the S2 diagnostic week
                // career-session hover text, per grade · semester
                const careerTitle = (grade: Grade, sem: 1 | 2) =>
                  grade === G11
                    ? sem === 1
                      ? "Career Session - update personal plan and choose three potential paths"
                      : "Career Session - finalise direction"
                    : sem === 1
                      ? "Career Session - career path exploration"
                      : "Career Session - set personal plan and explore universities / requirements";
                const primaries = PRIMARY_TRACKS.filter((t) => tracks.includes(t));
                if (primaries.length === 0) return null;
                return primaries.flatMap((track) => {
                  const ti = tracks.indexOf(track);
                  const center = laneCenterY(ti);
                  const triTop = center + 22 + 16; // sit a little lower, clear of the circle
                  // a white-bordered triangle — red for 1-on-1s, amber for career sessions.
                  // /test sits each marker just BELOW its circle, in the same week.
                  const mark = (key: string, cx: number, grade: Grade, week: number, color: string, title: string, align: "center" | "left" = "center", onLine = false) => {
                    const cy = testCurveY(track, momentumValueAt(testPtsFor(grade), week));
                    const top = testMode
                      ? (onLine ? cy - T / 2 : cy + 18) // on the line, or just under the circle (same week)
                      : triTop;
                    return (
                    <div key={key} className="group absolute pointer-events-auto cursor-default hover:!z-[70]"
                      style={{ left: cx - T / 2, top, width: T, height: T, zIndex: 48 }}>
                      <svg viewBox="0 0 16 16" width={T} height={T} className="overflow-visible" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>
                        <polygon points="8,1.5 1.5,14.5 14.5,14.5" fill={color} stroke="#fff" strokeWidth={1.8} strokeLinejoin="round" />
                      </svg>
                      <Tip align={align}>{title}</Tip>
                    </div>
                    );
                  };
                  const dot = (key: string, cx: number, grade: Grade, week: number, title: string) => mark(key, cx, grade, week, ONE_ON_ONE_COLOR, title);
                  const tri = (key: string, cx: number, grade: Grade, week: number, title: string, align: "center" | "left" = "center", onLine = false) => mark(key, cx, grade, week, CAREER_COLOR, title, align, onLine);
                  return gradeLanes.map(({ grade, variant }, g) => {
                    if (!trackMeta[track].grades.includes(grade)) return null;
                    return (
                      <Fragment key={`oo-${track}-${g}`}>
                        {gradeEvents[grade]
                          .filter(
                            (e) =>
                              (e.track ?? "qudrat") === track &&
                              (e.type === "waypoint" || e.type === "mock" || e.type === "realAttempt") &&
                              // In split G11 lanes the branch overlay handles S1+S2 markers
                              !(grade === G11 && track === "qudrat" && variant !== "default") &&
                              !(grade === G11 && track === "qudrat" && e.week >= BRANCH_W0),
                          )
                          .map((e) => {
                            const title = e.type === "mock"
                              ? "1 on 1 - results review after the mock"
                              : e.type === "realAttempt"
                                ? "1 on 1 - results review after the real attempt"
                                : "1 on 1 - before the section exam";
                            return dot(`oo-${e.id}`, gx(g, e.week + 0.5), grade, e.week + 0.5, title);
                          })}
                        {gradeEvents[grade]
                          .filter((e) => (e.track ?? "qudrat") === track && e.type === "diagnostic")
                          .map((e) => tri(`cs-${e.id}`, gx(g, e.week + 0.5), grade, e.week + 0.5, careerTitle(grade, 1), g === 0 ? "left" : "center"))}
                        {tri(`cs-s2-${track}-${g}`, gx(g, S2_DIAG_W + 0.5), grade, S2_DIAG_W + 0.5, careerTitle(grade, 2), "center", grade === 10 || grade === 12)}
                      </Fragment>
                    );
                  });
                });
              })()}
            </div>
            )}

            {/* BAND — months (top copy, /test only) */}
            {testMode && (
            <div className="absolute left-0 pointer-events-none bg-slate-50 border-y border-slate-200" style={{ top: TOP_MONTH_TOP, height: MONTH_H, width: TOTAL_W }}>
              {gradeLanes.map((_, g) =>
                monthTicks.map((m, i) => {
                  const next = i + 1 < monthTicks.length ? monthTicks[i + 1].week : WEEKS;
                  const w = next - m.week;
                  if (w <= 0) return null;
                  return (
                    <div key={`top-${g}-${m.label}`} className="absolute top-0 bottom-0 flex items-center justify-center border-l border-slate-200" style={{ left: gx(g, m.week), width: wpx(w) }}>
                      <span className="text-[9px] font-bold text-slate-500">{m.label}</span>
                    </div>
                  );
                }),
              )}
            </div>
            )}

            {/* BAND — week axis (top copy, /test only) */}
            {testMode && (
            <div className="absolute left-0 pointer-events-none" style={{ top: TOP_AXIS_TOP, height: TOP_WEEK_H, width: TOTAL_W }}>
              {gradeLanes.map((_, g) => (
                <Fragment key={`top-axis-${g}`}>
                  {AXIS_WEEKS.slice(0, -1).map((w) => (
                    <div key={`top-lab-${g}-${w}`} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center leading-none" style={{ left: gx(g, w + 0.5), top: TOP_WEEK_H / 2 }}>
                      <span className="text-[8px] font-medium text-slate-400">w{w + 1}</span>
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
            )}

            {/* BAND — months */}
            <div className="absolute left-0 pointer-events-none bg-slate-50 border-y border-slate-200" style={{ top: MONTH_TOP, height: MONTH_H, width: TOTAL_W }}>
              {gradeLanes.map((_, g) =>
                monthTicks.map((m, i) => {
                  const next = i + 1 < monthTicks.length ? monthTicks[i + 1].week : WEEKS;
                  const w = next - m.week;
                  if (w <= 0) return null;
                  return (
                    <div key={`${g}-${m.label}`} className="absolute top-0 bottom-0 flex items-center justify-center border-l border-slate-200" style={{ left: gx(g, m.week), width: wpx(w) }}>
                      <span className="text-[9px] font-bold text-slate-500">{m.label}</span>
                    </div>
                  );
                }),
              )}
            </div>

            {/* BAND — week axis */}
            <div className="absolute left-0 pointer-events-none" style={{ top: AXIS_TOP, height: AXIS_H, width: TOTAL_W }}>
              {gradeLanes.map((_, g) => (
                <Fragment key={g}>
                  {AXIS_WEEKS.map((w) => (
                    <div key={`tick-${g}-${w}`} className="absolute -translate-x-1/2 w-px h-1.5 bg-slate-300" style={{ left: gx(g, w), top: 0 }} />
                  ))}
                  {AXIS_WEEKS.slice(0, -1).map((w) => (
                    <div key={`lab-${g}-${w}`} className="absolute -translate-x-1/2 flex flex-col items-center leading-none" style={{ left: gx(g, w + 0.5), top: 4 }}>
                      <span className="text-[8px] font-medium text-slate-400">w{w + 1}</span>
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>

            {/* BAND — grade titles. Each gradeLane gets its own header pill showing
                the grade name + its level-entry tag (Level 1 / Level 2 for the G11 split). */}
            <div className="absolute left-0 pointer-events-none" style={{ top: 0, height: GH, width: TOTAL_W }}>
              {gradeLanes.map((gl, g) => (
                <div key={`title-${g}`} className="absolute flex items-center justify-center gap-2 px-4 rounded-md border-2 border-slate-800 bg-slate-900 text-white"
                  style={{ left: gx(g, 0), width: YEAR_W, top: 3, bottom: 3 }}>
                  <span className="text-sm font-extrabold tracking-tight whitespace-nowrap">{gl.title}</span>
                  {gl.levelTag && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-900 whitespace-nowrap">{gl.levelTag}</span>
                  )}
                </div>
              ))}
            </div>

            {/* G11 SEMESTER-1 BRANCHES — each G11 gradeLane column gets its own
                full-height S1 path (Level 1 lane → L1 branch; Level 2 lane → L2 branch).
                In /test the old single-column half-lane layout is kept. */}
            {!testMode && gradeLanes.map(({ grade, variant }, g) => {
              if (grade !== G11 || variant === "default") return null;
              const qti = tracks.indexOf("qudrat");
              if (qti < 0) return null;
              const branchIdx = variant === "l1" ? 0 : 1;
              const bp = g11S1Branches[branchIdx];
              const FULL_H = laneH(qti);
              const regionLeft = gx(g, 0);
              const regionW = wpx(G11_S1_END);
              const centerY = FULL_H / 2;
              const counts: Record<number, number> = {};
              bp.events.forEach((e) => { counts[e.week] = (counts[e.week] ?? 0) + 1; });
              const seen: Record<number, number> = {};
              const STEP = 36;
              return (
                <div key={`s1-${variant}`} className="absolute pointer-events-none"
                  style={{ left: regionLeft, width: regionW, top: COL_TOP + laneTop(qti), height: FULL_H, zIndex: 44 }}>
                  {/* coloured band fills (e.g. "Foundations" stretch for L1) */}
                  {bp.bands.map((bd, bdi) => {
                    const bc = bd.color ?? bp.color;
                    return (
                      <span key={bdi} className="absolute rounded-sm flex items-start justify-center"
                        style={{ left: wpx(bd.weekStart), width: wpx(bd.weekEnd - bd.weekStart), top: 2, height: FULL_H - 4,
                          background: `color-mix(in srgb, ${bc} 18%, #ffffff)` }}>
                        {bd.label && <span className="mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold text-white shadow" style={{ background: bc }}>{bd.label}</span>}
                      </span>
                    );
                  })}
                  {/* path label bottom-left */}
                  <span className="absolute left-2 bottom-2 z-10 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold text-white shadow" style={{ background: bp.color }}>{bp.levelTag}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white shadow bg-slate-700">{bp.label}</span>
                  </span>
                  {/* S1 milestone events */}
                  {bp.events.map((e, i) => {
                    const k = seen[e.week] ?? 0; seen[e.week] = k + 1;
                    const n = counts[e.week];
                    const offY = (k - (n - 1) / 2) * STEP;
                    const D = 44;
                    const badge = e.type === "realAttempt" ? "⭐" : e.type === "mock" ? "Mock" : e.short;
                    return (
                      <span key={i}
                        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-[3px] border-white shadow-md font-extrabold leading-none text-white text-[11px]"
                        style={{ left: wpx(e.week + 0.5), top: centerY + offY, width: D, height: D, background: eventTypeMeta[e.type].color }}>
                        {badge}
                      </span>
                    );
                  })}
                  {/* lane outline */}
                  <span className="pointer-events-none absolute inset-0 rounded-sm border-2 border-dashed" style={{ borderColor: bp.color }} />
                </div>
              );
            })}

            {/* G11 SEMESTER-2 BRANCHES — rendered for EVERY G11 gradeLane column.
                In the split main view both L1 and L2 columns get the same S2 branches
                (Level 3 on top, Level 2 / Strategy+ below). In /test the single G11
                column gets the same treatment as before. */}
            {gradeLanes.map(({ grade, variant }, gIdx) => { if (grade !== G11) return null;
              const qti = tracks.indexOf("qudrat");
              const FULL_H = laneH(qti);
              const regionLeft = gx(gIdx, BRANCH_W0);
              const regionW = wpx(WEEKS - BRANCH_W0);
              return (
                <div key={`s2-branches-${gIdx}`} className="absolute left-0 pointer-events-none" style={{ top: 0, height: TOTAL_H, width: TOTAL_W, zIndex: testMode ? 49 : 45 }}>
                  {g11Branches.map((bp, bi) => {
                    const isClub = bp.key === "club";
                    // /test: Strategy+ takes the full lane; the 90+ Club is rendered below
                    // as a compact "OR" deviation card instead of a parallel half-lane.
                    if (testMode && isClub) {
                      return (
                        <div key={bp.key} className="absolute pointer-events-none"
                          style={{ left: regionLeft, width: regionW, top: COL_TOP + laneTop(qti), height: FULL_H }}>
                          <div className="absolute right-3 top-2 flex items-start gap-2">
                            <button onClick={(ev) => open({ kind: "branch", grade: G11, path: bp.key }, ev)}
                              className="pointer-events-auto rounded-md px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg transition hover:brightness-110"
                              style={{ background: bp.color }}>
                              View Level 3 pathway ▸
                            </button>
                          </div>
                        </div>
                      );
                    }
                    // default: two stacked half-lanes (club on top, Strategy+ below);
                    // /test: Strategy+ owns the whole lane.
                    const subH = testMode ? FULL_H : FULL_H / 2;
                    const laneOffset = testMode ? 0 : bi * (FULL_H / 2);
                    const subTop = COL_TOP + laneTop(qti) + laneOffset;
                    const centerY = subH / 2;  // relative to the button (subTop)
                    const active = sel?.kind === "branch" && sel.grade === G11 && sel.path === bp.key;
                    // same-week events stack vertically around the row centre
                    const counts: Record<number, number> = {};
                    bp.events.forEach((e) => { counts[e.week] = (counts[e.week] ?? 0) + 1; });
                    const seen: Record<number, number> = {};
                    const STEP = 32;
                    // the 90+ Club opens a detail popover; Strategy+ stays display-only
                    const clickable = bp.key === "club";
                    const inner = (
                      <>
                        {/* lane fill. 90+ Club is filled with one subtle purple wash (weeks not
                            shown — keeps focus on the A/B choice); Strategy + stays translucent so
                            the underlying phase colours + the blue "Learning" band read through. */}
                        <span className="absolute inset-0 rounded-md transition-colors group-hover:brightness-95"
                          style={{ background: bp.key === "club" ? `color-mix(in srgb, ${bp.color} 12%, #ffffff)` : "transparent" }} />
                        {/* hover ring (only when clickable and not the selected path) */}
                        {clickable && !active && (
                          <span className="absolute inset-0 rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ boxShadow: `inset 0 0 0 2px ${bp.color}` }} />
                        )}
                        {/* path label bottom-left */}
                        <span className="absolute left-2 bottom-2 z-10 px-2 py-0.5 rounded text-[11px] font-extrabold text-white shadow" style={{ background: bp.color }}>
                          {bp.label}
                          {bp.key === "recovery" && <span className="ml-1.5 font-semibold opacity-75">{"(Level 2 → optional Level 3 upgrade)"}</span>}
                        </span>

                        {/* sub-period shading bands — solid week fills (no border): a blue
                            "Learning" stretch in Strategy +, purple active weeks in 90+ Club */}
                        {bp.bands.map((bd, bdi) => {
                          const bc = bd.color ?? bp.color;
                          return (
                            <span key={bd.label ?? bdi} className="absolute rounded-sm flex items-start justify-center"
                              style={{ left: gx(gIdx, bd.weekStart) - regionLeft, width: wpx(bd.weekEnd - bd.weekStart), top: 2, height: subH - 4,
                                // /test keeps the band translucent so the momentum line (below) shows through
                                background: testMode ? `color-mix(in srgb, ${bc} 15%, transparent)` : `color-mix(in srgb, ${bc} 26%, #ffffff)` }}>
                              {bd.label && <span className="mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold text-white shadow" style={{ background: bc }}>{bd.label}</span>}
                            </span>
                          );
                        })}

                        {/* week dividers — drawn ONLY over the solid bands (e.g. the cram band).
                            Everywhere else the Strategy + fill is transparent, so the chart's own
                            dashed week lines already show through — drawing them again would double
                            up (darker / solid-looking) lines. */}
                        {bp.bands.flatMap((bd) =>
                          Array.from({ length: bd.weekEnd - bd.weekStart - 1 }, (_, k) => bd.weekStart + 1 + k).map((w) => (
                            <span key={`wl-${w}`} className="pointer-events-none absolute top-0 bottom-0 z-20 border-l border-dashed"
                              style={{ left: gx(gIdx, w) - regionLeft, borderColor: "rgba(15,23,42,0.13)" }} />
                          )),
                        )}

                        {/* /test sits these markers ON the (compressed) momentum curve for the
                            Strategy+ path; otherwise they centre in the sub-lane row. The curve
                            y is COL_TOP-relative, so subtract this sub-lane's offset to make it
                            relative to the button. */}
                        {/* plotted events (Cram / Mock / Real) — same circle treatment as the main lane */}
                        {!markersHidden && bp.events.map((e, i) => {
                          const k = seen[e.week] ?? 0; seen[e.week] = k + 1;
                          const n = counts[e.week];
                          const offY = (k - (n - 1) / 2) * STEP;
                          const D = testMode ? 30 : 44;   // /test: compact labelled circle
                          const badge = e.type === "realAttempt" ? `⭐${e.short}` : e.type === "mock" ? "Mock" : e.short;
                          const tip = e.short === "CRAM"
                            ? "Cram - covers all the content in a condensed period of time"
                            : eventTip(e);
                          // The July attempt sits in the summer-break strip. There's no week
                          // column or curve there, so in /test level it with the END of the
                          // momentum line (G11 week 44) so it reads as a continuation.
                          const onCurve = testMode && bp.key === "recovery" && !e.summer;
                          const top = e.summer
                            ? (testMode
                                ? testCurveY("qudrat", momentumValueAt(testPtsFor(G11), WEEKS)) - (laneTop(qti) + laneOffset)
                                : centerY + offY)
                            : onCurve
                              ? testCurveY("qudrat", momentumValueAt(testPtsFor(G11), e.week + 0.5)) - (laneTop(qti) + laneOffset)
                              : centerY + offY;
                          const left = e.summer ? regionW + SUMMER_W / 2 : gx(gIdx, e.week + 0.5) - regionLeft;
                          return (
                            <span key={i}
                              className={`group pointer-events-auto cursor-default absolute z-20 hover:!z-[70] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border-[3px] border-white shadow-md font-extrabold leading-none text-white ${testMode ? "text-[7px]" : "text-[11px]"}`}
                              style={{ left, top, width: D, height: D, background: eventTypeMeta[e.type].color }}>
                              {testMode ? testBadge(e) : badge}
                              <Tip place="top">{tip}</Tip>
                            </span>
                          );
                        })}

                        {/* 1-on-1 results review beside each mock / real attempt in this path
                            (not the July attempt — it's during the summer break, no sessions). */}
                        {!markersHidden && bp.events.filter((e) => (e.type === "mock" || e.type === "realAttempt") && !e.summer).map((e, i) => {
                          const onCurve = testMode && bp.key === "recovery" && !e.summer;
                          // /test: sit just below the circle, in the same week.
                          const sameWeek = e.week + 0.5;
                          const top = onCurve
                            ? testCurveY("qudrat", momentumValueAt(testPtsFor(G11), sameWeek)) - (laneTop(qti) + laneOffset) + 29
                            : centerY + 22 + 18;
                          const left = e.summer ? regionW + SUMMER_W / 2 : gx(gIdx, sameWeek) - regionLeft;
                          return (
                          <span key={`oo-${i}`}
                            className="group pointer-events-auto cursor-default absolute z-30 hover:!z-[70] -translate-x-1/2 -translate-y-1/2"
                            style={{ left, top, width: testMode ? 24 : 16, height: testMode ? 24 : 16 }}>
                            <svg viewBox="0 0 16 16" width={testMode ? 24 : 16} height={testMode ? 24 : 16} className="overflow-visible" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.3))" }}>
                              <polygon points="8,1.5 1.5,14.5 14.5,14.5" fill={ONE_ON_ONE_COLOR} stroke="#fff" strokeWidth={1.8} strokeLinejoin="round" />
                            </svg>
                            <Tip>{e.type === "realAttempt" ? "1 on 1 - results review after the real attempt" : "1 on 1 - results review after the mock"}</Tip>
                          </span>
                          );
                        })}

                        {/* forked choices (no fixed week) — e.g. 90+ Club's two routes, centred */}
                        {bp.options.length > 0 && (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4">
                            {bp.options.map((opt, i) => (
                              <span key={i} className="text-[11px] font-extrabold whitespace-nowrap" style={{ color: bp.color }}>
                                {i === 0 ? "Option A" : "Option B"} - {opt}
                              </span>
                            ))}
                          </span>
                        )}

                        {/* lane outline — rendered last so it always wraps the full lane,
                            even over the solid week bands. /test keeps it solid + grey to
                            match the Foundation / Strategy section boxes. */}
                        <span className={`pointer-events-none absolute inset-0 rounded-md border-2 ${testMode ? "" : "border-dashed"}`}
                          style={{ borderColor: testMode ? "#0f172a" : bp.color, boxShadow: active ? `inset 0 0 0 3px ${bp.color}` : undefined }} />
                      </>
                    );
                    return clickable ? (
                      <button key={bp.key} onClick={(ev) => open({ kind: "branch", grade: G11, path: bp.key }, ev)}
                        className="absolute text-left transition group pointer-events-auto"
                        style={{ left: regionLeft, width: regionW, top: subTop, height: subH }}>
                        {inner}
                      </button>
                    ) : (
                      <div key={bp.key}
                        className="absolute text-left"
                        style={{ left: regionLeft, width: regionW, top: subTop, height: subH }}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* /test — EOC- and Review-cycle triggers, each pinned to the TOP-LEFT of
                its own region on the G10 Qudrat lane: EOC inside the Foundation box
                (w0), Review at the start of semester 2 (w23). */}
            {testMode && (() => {
              // EOC/Review cycle triggers live only on the G10 Qudrat lane.
              const allCells: { grade: Grade; track: Track }[] = [
                { grade: 10, track: "qudrat" },
              ];
              const cells = allCells.filter((c) => grades.includes(c.grade) && tracks.includes(c.track));
              if (cells.length === 0) return null;
              return (
                <div className="absolute left-0 pointer-events-none" style={{ top: 0, height: TOTAL_H, width: TOTAL_W, zIndex: 48 }}>
                  {cells.map(({ grade, track }) => {
                    const g = gradeLanes.findIndex((gl) => gl.grade === grade && gl.variant === "default");
                    const ti = tracks.indexOf(track);
                    const top = COL_TOP + laneTop(ti) + 8;  // just inside the box top edge
                    return (
                      <Fragment key={`cyc-${grade}-${track}`}>
                        <button onClick={(ev) => open({ kind: "eoc", grade }, ev)}
                          className="pointer-events-auto absolute rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg hover:bg-blue-700"
                          style={{ left: gx(g, 0) + 8, top }}>
                          View EOC cycle ▸
                        </button>
                        <button onClick={(ev) => open({ kind: "review", grade }, ev)}
                          className="pointer-events-auto absolute rounded-md bg-green-600 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg hover:bg-green-700"
                          style={{ left: gx(g, G10_REVIEW_START) + 8, top }}>
                          View review cycle ▸
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
              );
            })()}

            {/* OVERLAY — "Pre mock bootcamp" bands */}
            <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W, zIndex: 46 }}>
              {gradeLanes.map(({ grade }, g) =>
                bootcampBands.filter((b) => b.grade === grade).map((b) =>
                  tracks.map((track, ti) => {
                    if (!trackMeta[track].grades.includes(grade)) return null;
                    if (track === "english") return null;
                    const left = gx(g, b.weekStart);
                    const w = wpx(b.weekEnd - b.weekStart);
                    const inOldBranch = testMode && grade === G11 && track === "qudrat" && b.weekStart >= BRANCH_W0;
                    const labelTop = laneTop(ti) + LANE_LABEL_H + (inOldBranch ? (laneH(ti) - LANE_LABEL_H) / 2 : 0);
                    const labelH = inOldBranch ? (laneH(ti) - LANE_LABEL_H) / 2 : laneH(ti) - LANE_LABEL_H;
                    return (
                      <Fragment key={`bc-${g}-${track}-${b.weekStart}`}>
                        <div className="absolute" style={{ left, width: w, top: laneTop(ti), height: laneH(ti), background: HATCH_BOOTCAMP }} />
                        <span className="absolute flex items-center justify-center" style={{ left, width: w, top: labelTop, height: labelH }}>
                          <span className="text-[9px] font-bold leading-none whitespace-nowrap -rotate-90 text-slate-400">{b.label}</span>
                        </span>
                      </Fragment>
                    );
                  }),
                ),
              )}
            </div>

            {/* OVERLAY — G12 Tahsili semester-2 subject reviews */}
            <div className="absolute left-0 pointer-events-none" style={{ top: COL_TOP, height: COL_H, width: TOTAL_W, zIndex: 46 }}>
              {gradeLanes.map(({ grade }, g) =>
                subjectReviewBands.filter((b) => b.grade === grade).map((b) => {
                  const ti = tracks.indexOf(b.track);
                  if (ti < 0 || !trackMeta[b.track].grades.includes(grade)) return null;
                  const color = tahsiliSubjectColor[b.subject] ?? "#475569";
                  const left = gx(g, b.weekStart);
                  const w = wpx(b.weekEnd - b.weekStart);
                  const hatch = `repeating-linear-gradient(45deg, color-mix(in srgb, ${color} 22%, transparent) 0 6px, transparent 6px 11px)`;
                  return (
                    <Fragment key={`sr-${g}-${b.track}-${b.weekStart}`}>
                      <div className="absolute" style={{ left, width: w, top: laneTop(ti), height: laneH(ti), background: hatch }} />
                      <span className="absolute flex items-center justify-center" style={{ left, width: w, top: laneTop(ti) + LANE_LABEL_H, height: laneH(ti) - LANE_LABEL_H }}>
                        <span className="rounded px-1 py-0.5 text-[8px] font-bold leading-none whitespace-nowrap -rotate-90 text-white" style={{ background: color }}>{b.label}</span>
                      </span>
                    </Fragment>
                  );
                }),
              )}
            </div>

            {/* SECTION highlights — dashed outline per (gradeLane, qudrat track) */}
            <div className="absolute left-0 pointer-events-none" style={{ top: 0, height: TOTAL_H, width: TOTAL_W, zIndex: testMode ? 46 : 40 }}>
              {gradeLanes.map(({ grade, variant }, g) =>
                tracks.map((track, ti) => {
                  if (!trackMeta[track].grades.includes(grade)) return null;
                  if (track !== "qudrat") return null;
                  const s1FinalsStart = phases.find((p) => p.finals)?.weekStart ?? WEEKS;
                  const s2FinalsStart = phases.find((p) => p.key === "finalsS2")?.weekStart ?? WEEKS;
                  // For split G11 lanes: S1 box only (S2 is the branch overlay's territory)
                  const cropWeek = (grade === G11 && variant !== "default") ? s1FinalsStart
                    : grade === G11 ? s1FinalsStart
                    : grade === 10 ? s2FinalsStart : null;
                  const width = cropWeek != null ? wpx(cropWeek) : YEAR_W;
                  const moodLabel = (grade === G11 && variant === "l1") ? "Level 1"
                    : (grade === G11 && variant === "l2") ? "Level 2"
                    : semesterMood[grade][1];
                  return (
                    <div key={`sec-${g}-${track}`}
                      className={`absolute rounded-md border-2 ${testMode ? "border-slate-900" : "border-dashed border-slate-500"}`}
                      style={{ left: gx(g, 0), width, top: COL_TOP + laneTop(ti), height: laneH(ti) }}>
                      {track === "qudrat" && (
                        <span className="absolute left-2 bottom-2 z-10 px-2 py-0.5 rounded text-[11px] font-extrabold text-white shadow bg-slate-900">{moodLabel}</span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>

            {/* EOC-CYCLE region */}
            {!testMode && (
            <div className="absolute left-0 pointer-events-none" style={{ top: 0, height: TOTAL_H, width: TOTAL_W, zIndex: 15 }}>
              {gradeLanes.map(({ grade }, g) => {
                if (grade !== 10) return null;
                const ti = tracks.indexOf("qudrat");
                const active = sel?.kind === "eoc" && sel.grade === grade;
                const left = gx(g, EOC1_W + 1);                 // just after the EOC 1 circle
                const width = wpx(EOC2_W - (EOC1_W + 1));        // up to the EOC 2 circle
                return (
                  <button key={`eoc-${grade}`} onClick={(ev) => open({ kind: "eoc", grade }, ev)}
                    className={`group absolute overflow-hidden rounded-md pointer-events-auto transition ${active ? "bg-violet-500/[0.2]" : "bg-violet-500/[0.12] hover:bg-violet-500/[0.22]"}`}
                    style={{ left, width, top: COL_TOP + laneTop(ti), height: laneH(ti) }}>
                    {!active && <span className="pointer-events-none overlay-diag"
                      style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(124,58,237,0.14), transparent)" }} />}
                    <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-extrabold text-white shadow whitespace-nowrap bg-violet-600"
                      style={{ top: LANE_LABEL_H + (laneH(ti) - LANE_LABEL_H) / 2 }}>EOC cycle ▸</span>
                  </button>
                );
              })}
            </div>
            )}

            {/* REVIEW-CYCLE region */}
            {!testMode && (
            <div className="absolute left-0 pointer-events-none" style={{ top: 0, height: TOTAL_H, width: TOTAL_W, zIndex: 15 }}>
              {gradeLanes.map(({ grade }, g) => {
                if (grade !== 10) return null;
                const ti = tracks.indexOf("qudrat");
                const active = sel?.kind === "review" && sel.grade === grade;
                const left = gx(g, G10_REVIEW_START);           // G10 review starts at W30 (after Ramadan+Eid)
                const width = wpx(WEEKS - G10_REVIEW_START);    // to year end (w44)
                return (
                  <button key={`review-${grade}`} onClick={(ev) => open({ kind: "review", grade }, ev)}
                    className={`group absolute overflow-hidden rounded-md pointer-events-auto transition ${active ? "bg-green-500/[0.2]" : "bg-green-500/[0.12] hover:bg-green-500/[0.22]"}`}
                    style={{ left, width, top: COL_TOP + laneTop(ti), height: laneH(ti) }}>
                    {!active && <span className="pointer-events-none overlay-diag"
                      style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(22,163,74,0.14), transparent)" }} />}
                    <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-extrabold text-white shadow whitespace-nowrap bg-green-600"
                      style={{ top: LANE_LABEL_H + (laneH(ti) - LANE_LABEL_H) / 2 }}>Review cycle ▸</span>
                  </button>
                );
              })}
            </div>
            )}

          </div>
        </div>
      </main>

      <Legend testMode={testMode} markersHidden={markersHidden} onToggle={() => setMarkersHidden((v) => !v)} />

      {sel && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center p-3 sm:p-8" onClick={close}>
          <div className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${shown ? "opacity-100" : "opacity-0"}`} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ transformOrigin: origin }}
            className={`relative w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden rounded-xl bg-white border border-slate-200 shadow-2xl transition-all duration-200 ease-out ${shown ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
          >
            {sel.kind === "eoc" ? (
              <EOCCycle grade={sel.grade} onClose={close} />
            ) : sel.kind === "review" ? (
              <ReviewCycle grade={sel.grade} onClose={close} />
            ) : (() => {
              const bp = g11Branches.find((b) => b.key === sel.path)!;
              return (
                <div className="overflow-y-auto p-5">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded text-sm font-extrabold text-white" style={{ background: bp.color }}>{bp.label}</span>
                      <h2 className="text-2xl font-bold text-slate-800">{gradeMeta[sel.grade].title} · Semester 2 path</h2>
                    </div>
                    <button onClick={close} className="text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50">✕ close</button>
                  </div>
                  <p className="mt-4 text-sm text-slate-600 max-w-3xl">{bp.desc}</p>
                  {bp.options.length > 0 && (
                    <div className="mt-5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Two ways to spend the runway</div>
                      <div className="flex flex-col gap-2">
                        {bp.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: bp.color }}>{i === 0 ? "A" : "B"}</span>
                            <span className="text-sm font-semibold text-slate-700">{opt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {bp.advanced && (
                    <div className="mt-5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Advanced path</div>
                      <p className="text-sm text-slate-600 max-w-3xl">{bp.advanced.intro}</p>
                      <div className="mt-3 flex flex-col gap-2">
                        {bp.advanced.scenarios.map((s, i) => (
                          <div key={i} className="rounded-md border-l-4 px-3 py-2.5" style={{ borderColor: bp.color, background: `color-mix(in srgb, ${bp.color} 7%, #ffffff)` }}>
                            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: bp.color }}>{s.when}</div>
                            <div className="mt-0.5 text-sm font-semibold text-slate-700">{s.then}</div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[13px] font-semibold text-slate-600">{bp.advanced.agreement}</p>
                    </div>
                  )}
                  {bp.events.length > 0 && (
                    <div className="mt-5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Milestones</div>
                      <ol className="relative border-l-2 ml-2 space-y-5" style={{ borderColor: bp.color }}>
                        {bp.events.map((e, i) => (
                          <li key={i} className="ml-5">
                            <span className="absolute -left-[7px] h-3 w-3 rounded-full border-2 border-white" style={{ background: eventTypeMeta[e.type].color }} />
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-bold text-slate-800">{e.label}</span>
                              <span className="text-[11px] font-semibold text-slate-400">w{Math.floor(e.week) + 1}</span>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function GutterLabel({ top, text }: { top: number; text: string }) {
  return (
    <div className="absolute right-3 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right leading-tight" style={{ top }}>
      {text}
    </div>
  );
}

// Key for the assessment bubbles, shown as a footer strip under the canvas.
// Small hover tooltip shown above a marker (used for the 1-on-1 / career dots,
// whose parent band is pointer-events-none so the native title never fires).
function Tip({ children, align = "center", place = "top" }: { children: string; align?: "center" | "left"; place?: "top" | "bottom" }) {
  const pos = align === "left" ? "left-0" : "left-1/2 -translate-x-1/2";
  const vert = place === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5";
  return (
    <span className={`pointer-events-none absolute hidden group-hover:block z-[60] w-max max-w-[220px] rounded bg-slate-900 px-2 py-1 text-[10px] font-semibold leading-snug text-white text-center shadow-lg ${pos} ${vert}`}>
      {children}
    </span>
  );
}

function Legend({ testMode, markersHidden, onToggle }: { testMode: boolean; markersHidden: boolean; onToggle: () => void }) {
  const items: { type: keyof typeof eventTypeMeta; badge: string }[] = [
    { type: "diagnostic", badge: "Dia" },
    { type: "waypoint", badge: "EOC" },
    { type: "mock", badge: "Mock" },
    { type: "realAttempt", badge: "⭐" },
    { type: "tournament", badge: "🏆" },
  ];
  const toggle = (
    <button onClick={onToggle}
      className="ml-auto shrink-0 rounded border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
      {markersHidden ? "Show markers" : "Hide markers"}
    </button>
  );
  return (
    <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Key</span>
        {!testMode && items.map(({ type, badge }) => {
          const isTournament = type === "tournament";
          const ringC = isTournament ? eventTypeMeta.mock.color : "#fff";
          const textC = isTournament ? eventTypeMeta.mock.color : "#fff";
          const sz = testMode ? 26 : 28; // matches the chart circles
          return (
            <span key={type} className="flex items-center gap-2">
              <span className={`flex items-center justify-center rounded-full border-[3px] shadow-sm font-extrabold leading-none ${testMode ? "text-[7px]" : "text-[9px]"}`}
                style={{ width: sz, height: sz, background: eventTypeMeta[type].color, borderColor: ringC, color: textC }}>
                {testMode ? testBadge({ type, short: "" }) : badge}
              </span>
              <span className="text-[12px] font-semibold text-slate-600">{eventTypeMeta[type].label}</span>
            </span>
          );
        })}
        {!testMode && (
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" width={16} height={16}>
              <polygon points="8,1.5 1.5,14.5 14.5,14.5" fill={ONE_ON_ONE_COLOR} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] font-semibold text-slate-600">1-on-1</span>
          </span>
        )}
        {!testMode && (
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" width={16} height={16}>
              <polygon points="8,1.5 1.5,14.5 14.5,14.5" fill={CAREER_COLOR} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] font-semibold text-slate-600">Career session</span>
          </span>
        )}
        {!testMode && <span className="h-5 w-px bg-slate-200" />}
        <span className="flex items-center gap-2">
          <span className="h-4 w-6 rounded border-2" style={{ background: "#bfdbfe", borderColor: "#1e40af" }} />
          <span className="text-[12px] font-semibold text-slate-600">Learning phase</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-4 w-6 rounded border-2" style={{ background: "#bbf7d0", borderColor: "#166534" }} />
          <span className="text-[12px] font-semibold text-slate-600">Review phase</span>
        </span>
        {testMode && (
          <span className="flex items-center gap-2">
            <svg width={24} height={12} viewBox="0 0 24 12">
              <path d="M0,10 L24,2" fill="none" stroke="#6366f1" strokeWidth={2.25} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] font-semibold text-slate-600">Momentum</span>
          </span>
        )}
        {testMode && (
          <span className="flex items-center gap-2">
            <svg width={24} height={12} viewBox="0 0 24 12">
              <path d="M0,10 L24,2" fill="none" stroke="#fb923c" strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] font-semibold text-slate-600">Personalisation</span>
          </span>
        )}
        {toggle}
      </div>
    </div>
  );
}

function SemBar({ xOffset, start, end, color, border, fill, label, goal, testMode }: { xOffset: number; start: number; end: number; color: string; border?: string; fill: string; label: string; goal: string; testMode?: boolean }) {
  const wks = end - start;
  return (
    <div className={`absolute flex flex-col items-center justify-center rounded-md border-2 leading-tight px-2 text-center ${testMode ? "gap-1.5 py-3" : "gap-1 py-1.5"}`} style={{ left: xOffset + wpx(start), width: wpx(wks), top: 3, bottom: 3, background: fill, borderColor: border ?? color }}>
      <span className={testMode ? "text-sm font-extrabold tracking-tight" : "text-[11px] font-extrabold tracking-wide"} style={{ color: testMode ? "#0f172a" : color }}>{label}</span>
      <span className={testMode ? "text-[11px] font-semibold text-slate-600" : "text-[10px] font-semibold text-slate-500"}>{goal}</span>
    </div>
  );
}

function MomentumSpark({ xOffset }: { xOffset: number }) {
  const TOP = 14, H = MOM_H - 20;
  const yy = (v: number) => TOP + (1 - v) * H;
  const line = MOM_PTS.map((p, i) => `${i === 0 ? "M" : "L"}${wpx(p.week)},${yy(p.value)}`).join(" ");
  const area = `${line} L${wpx(WEEKS)},${TOP + H} L0,${TOP + H} Z`;
  return (
    <svg className="absolute" style={{ left: xOffset, top: 0 }} width={YEAR_W} height={MOM_H}>
      <path d={area} fill="#fdba7455" />
      <path d={line} fill="none" stroke="#0d9488" strokeWidth={1.75} strokeLinejoin="round" />
    </svg>
  );
}

