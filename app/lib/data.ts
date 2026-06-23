// ---------------------------------------------------------------------------
// Learning Journey — data model
// Three layers plotted on one week-indexed axis:
//   1. calendar skeleton (fixed, grade-agnostic)
//   2. momentum / effort curve (fixed shape every year)
//   3. academic structure (diagnostics, waypoints, attempts, states, lanes)
// Grades 10 / 11 / 12 run the same skeleton with different payloads.
// ---------------------------------------------------------------------------

export const WEEK_MIN = 0;
export const WEEK_MAX = 44;

// Week 0 starts on Sunday 23 Aug 2026 (the Saudi week starts Sunday). This anchor
// makes week 24 land on 7 Feb 2027, matching the Ramadan dates. Dates are shown
// for a representative academic year to anchor the otherwise-generic week ruler.
export const YEAR_START = new Date(2026, 7, 23);
export function weekStartDate(week: number): Date {
  const d = new Date(YEAR_START);
  d.setDate(d.getDate() + week * 7);
  return d;
}
export function weekDateLabel(week: number): string {
  return weekStartDate(week).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
// Inclusive calendar span of weeks [startWeek, endWeek): from the first day of
// startWeek to the last day before endWeek. Formatted "DD–DD Mon" when it stays
// within one month, otherwise "DD Mon – DD Mon".
export function weekRangeLabel(startWeek: number, endWeek: number): string {
  const a = weekStartDate(startWeek);
  const b = weekStartDate(endWeek);
  b.setDate(b.getDate() - 1);
  const dd = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit" });
  const mon = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
  return mon(a) === mon(b) ? `${dd(a)}–${dd(b)} ${mon(a)}` : `${dd(a)} ${mon(a)} – ${dd(b)} ${mon(b)}`;
}

// ----- Layer 1: calendar skeleton -----------------------------------------

export type PhaseKey =
  | "coreA"
  | "autumnBreak"
  | "coreB"
  | "finals"
  | "midYearBreak"
  | "review"
  | "ramadan"
  | "eidFitr"
  | "revisionA"
  | "eidAdha"
  | "revisionB"
  | "finalsS2";

export interface Phase {
  key: PhaseKey;
  label: string;
  short: string;     // compact label for the narrow per-lane strip
  weekStart: number;
  weekEnd: number;
  months: string;
  what: string;
  dead?: boolean;
  finals?: boolean;   // blocked out for final exams — no teaching sessions
}

// Mapped onto the proposed 2026/2027 Saudi academic calendar (two semesters,
// ~44 teaching-and-break weeks). Only multi-day/week closures are modelled as
// break phases: an autumn break, the mid-year break between semesters, the
// Founding Day → Ramadan → Eid al-Fitr block, and Eid al-Adha near year end.
// National Day is a single day, so it sits inside continuous Core instruction.
export const phases: Phase[] = [
  { key: "coreA", label: "Learning", short: "Learning", weekStart: 0, weekEnd: 13, months: "Aug–Nov", what: "New concept teaching, ramps up from the start of the year (National Day is a single day off within this block)." },
  { key: "autumnBreak", label: "Autumn break", short: "Autumn", weekStart: 13, weekEnd: 14, months: "Nov", what: "Short autumn break — no teaching.", dead: true },
  { key: "coreB", label: "Learning", short: "Learning", weekStart: 14, weekEnd: 18, months: "Nov–Dec", what: "Final new content of semester 1, teaching at peak pace into the finals fortnight." },
  { key: "finals", label: "School finals", short: "School finals", weekStart: 18, weekEnd: 20, months: weekRangeLabel(18, 20), what: `Semester-1 school final exams (${weekRangeLabel(18, 20)}). The two weeks before the mid-year break are blocked out — no teaching sessions, exams only.`, finals: true },
  { key: "midYearBreak", label: "Mid-year break", short: "Mid-year", weekStart: 20, weekEnd: 22, months: "Jan", what: "Mid-year holiday between the two semesters — no teaching.", dead: true },
  { key: "review", label: "Review & consolidation", short: "Review", weekStart: 22, weekEnd: 24, months: "Jan–Feb", what: "Re-engage and consolidate prior learning to open semester 2, no heavy new content, before Ramadan begins." },
  { key: "ramadan", label: "Ramadan", short: "Ramadan", weekStart: 24, weekEnd: 28, months: "Feb–Mar", what: "Ramadan (≈7 Feb – 8 Mar) — no instruction, plan for nothing. Founding Day (22 Feb) falls within this block.", dead: true },
  { key: "eidFitr", label: "Eid al-Fitr", short: "Eid al-Fitr", weekStart: 28, weekEnd: 30, months: "Mar", what: "Eid al-Fitr break straight after Ramadan — no teaching.", dead: true },
  { key: "revisionA", label: "Review & exam practice", short: "Review", weekStart: 30, weekEnd: 37, months: "Mar–May", what: "Applied practice and revision: the main exam-readiness push of semester 2." },
  { key: "eidAdha", label: "Eid al-Adha", short: "Eid al-Adha", weekStart: 37, weekEnd: 39, months: "May", what: "Eid al-Adha break — no teaching.", dead: true },
  { key: "revisionB", label: "Review & exam practice", short: "Review", weekStart: 39, weekEnd: 42, months: "May–Jun", what: "Final revision and any last attempts before the year-end finals." },
  { key: "finalsS2", label: "School finals", short: "School finals", weekStart: 42, weekEnd: 44, months: weekRangeLabel(42, 44), what: `Semester-2 school final exams (${weekRangeLabel(42, 44)}). The last two weeks of the year are blocked out — no teaching sessions, exams only.`, finals: true },
];

// ----- Layer 1b: weekly delivery cadence (drill-down inside a phase) -------
// Each teaching week runs Sunday–Thursday (Saudi school week) with a fixed
// day-by-day pattern of subject classes, Thursday mastery sessions and the
// cross-subject homework set. Opening a phase zooms into a week-by-week view;
// opening a week shows this day-by-day schedule.

export type Subject = "kammi" | "lafthi";

export const subjectMeta: Record<Subject, { label: string; color: string }> = {
  kammi: { label: "Kammi", color: "#1d4ed8" },
  lafthi: { label: "Lafthi", color: "#7c3aed" },
};

export const HOMEWORK_COLOR = "#b45309";
export const MASTERY_COLOR = "#0d9488";

export const IDENTITY_COLOR = "#be185d";

export type WeekDay = "Sun" | "Mon" | "Tue" | "Wed" | "Thu";
export type SessionKind = "class" | "mastery" | "homework" | "identity" | "practice" | "team" | "roundup";

// Colours for the review-period session kinds (learning-mode kinds use the
// HOMEWORK/MASTERY/IDENTITY/subject colours above).
export const PRACTICE_COLOR = "#4f46e5"; // solo competition / timed practice
export const TEAM_COLOR = "#059669";     // team activity / group challenge
export const ROUNDUP_COLOR = "#ea580c";  // topic round-up / quiz games

export interface DaySession {
  kind: SessionKind;
  label: string;
  subject?: Subject;     // present for class / mastery
  detail?: string;
}

export interface DayPlan {
  day: WeekDay;
  sessions: DaySession[];
}

// The standard teaching week, shared by every non-dead phase.
//  Sun: Kammi + Lafthi class
//  Mon: Kammi + Lafthi class
//  Tue: Kammi class
//  Wed: homework session covering both Kammi + Lafthi (also where any
//       diagnostic / section exam for the week is placed)
//  Thu: mastery session covering both Kammi + Lafthi
export const teachingWeek: DayPlan[] = [
  { day: "Sun", sessions: [{ kind: "class", subject: "kammi", label: "Kammi class" }, { kind: "class", subject: "lafthi", label: "Lafthi class" }] },
  { day: "Mon", sessions: [{ kind: "class", subject: "kammi", label: "Kammi class" }, { kind: "class", subject: "lafthi", label: "Lafthi class" }] },
  { day: "Tue", sessions: [{ kind: "class", subject: "kammi", label: "Kammi class" }] },
  { day: "Wed", sessions: [
    { kind: "homework", label: "Homework session", detail: "Covers everything learned that week across both Kammi and Lafthi. Due the following Wednesday. Coins awarded on completion." },
  ] },
  { day: "Thu", sessions: [
    { kind: "mastery", label: "Mastery session", detail: "Single combined session covering both Kammi and Lafthi." },
  ] },
];

// ----- The EOC (section-exam) cycle ----------------------------------------
// A single section-exam cycle is ~5 weeks: re-entry after the previous exam,
// a build phase as homework and competition ramp up, then a round-up phase of
// consolidation and games leading into the exam. Intensity climbs across the
// cycle, peaks at the exam, then drops away before the next cycle.
export type CycleMode = "learning" | "review";

export interface EocCycleWeek {
  week: number;        // 1..5 within the cycle
  band: string;        // grouping label
  bandColor: string;
  intensity: number;   // 0..1 — engagement / activity level (drives the curve)
  headline: string;
  bullets: string[];
}

// The momentum shape across the cycle: week 1 starts low (warm-up after the
// previous cycle's reward trip), climbs through weeks 2–4 (round-up +
// competitive games), and PEAKS at week 5 where the exam sits — then momentum
// curves down to the bottom, where the student heads off on a celebration trip.
export const eocCycle: EocCycleWeek[] = [
  {
    week: 1, band: "Chill", bandColor: "#0891b2", intensity: 0.2,
    headline: "Relax from last EOC",
    bullets: ["Redemption event all week — spend coins, rewarding effort not grades", "Concept coverage Sun–Wed", "Mastery + week activity Thursday"],
  },
  {
    week: 2, band: "Back at it", bandColor: "#2563eb", intensity: 0.4,
    headline: "Build up knowledge",
    bullets: ["Concept coverage & marathons", "Independent work (replaces homework) midweek", "Mastery + fun/career activity Thursday"],
  },
  {
    week: 3, band: "Getting Warmer", bandColor: "#2563eb", intensity: 0.6,
    headline: "Build up more compound knowledge",
    bullets: ["Concept team exercises all week", "Independent work (replaces homework) midweek", "Mastery + fun/career activity Thursday"],
  },
  {
    week: 4, band: "Getting Warmer", bandColor: "#2563eb", intensity: 0.78,
    headline: "Build up more compound knowledge",
    bullets: ["Concept team competitions all week", "Independent work (replaces homework) midweek", "Mastery + fun/career activity Thursday"],
  },
  {
    week: 5, band: "The Peak", bandColor: "#dc2626", intensity: 1,
    headline: "EOC stress",
    bullets: ["Review games to consolidate", "Topic round-up Wednesday", "EOC exam + relaxing activity Thursday"],
  },
];

// Two weekly cadences a student experiences. "learning" is the standard
// teaching week; "review" replaces direct instruction with independent
// practice, team challenges and a topic round-up. The week drill-down toggles
// between the two because the daily shape is different.
export const learningWeek: DayPlan[] = teachingWeek;

export const reviewWeek: DayPlan[] = [
  { day: "Sun", sessions: [
    { kind: "class", subject: "kammi", label: "Review class", detail: "Past-paper walkthrough across Kammi — worked examples, common traps." },
    { kind: "class", subject: "lafthi", label: "Review class", detail: "Past-paper walkthrough across Lafthi — worked examples, common traps." },
  ] },
  { day: "Mon", sessions: [
    { kind: "class", subject: "kammi", label: "Targeted drills", detail: "Weak-topic drills picked from the latest diagnostics." },
  ] },
  { day: "Tue", sessions: [
    { kind: "practice", label: "Solo competition", detail: "Timed solo practice on a leaderboard — independent recall under exam-like conditions." },
  ] },
  { day: "Wed", sessions: [
    { kind: "team", label: "Team activity", detail: "Group challenge in place of the homework session — collaborative problem solving against the clock." },
  ] },
  { day: "Thu", sessions: [
    { kind: "roundup", label: "Topic round-up", detail: "Quiz games and a round-up of the cycle's topics to prepare for the section exam." },
  ] },
];

// The day a diagnostic or section exam sits in its week: Thursday, taking the
// place of that week's mastery session. In such a week the Wednesday homework
// session becomes a "Topic roundup session" instead.
export const EXAM_DAY: WeekDay = "Thu";
export const ROUNDUP_LABEL = "Topic roundup session";
export const ROUNDUP_DETAIL = "Replaces the usual homework session in an exam week — a roundup of the week's topics across Kammi and Lafthi to prepare for the exam.";

// One-off single-day holidays that fall inside an otherwise-teaching week
// (e.g. National Day). Too short to be their own break phase, but shown as a
// day off in the week drill-down. Keyed by week-in-year.
export const DAYOFF_COLOR = "#dc2626";
export const dayOffs: Record<number, { day: WeekDay; label: string; detail: string }> = {
  4: { day: "Wed", label: "National Day", detail: "National Day public holiday — a single day off. No classes or homework session on this day." },
};

// Identity sessions: a goal-setting session in the first week of the year, and
// an identity check-in at the start of semester 2. Keyed by week-in-year; both
// sit on the Sunday of their week.
export const identitySessions: Record<number, DaySession> = {
  0: { kind: "identity", label: "Identity session", detail: "First week of the year. Goal-setting and identity work — set the targets and agree the plan to get there." },
  22: { kind: "identity", label: "Identity check-in", detail: "Start of semester 2. Revisit goals and identity, then adjust the plan based on progress so far." },
};

// Per-phase summary line. Dead phases have no teaching week.
export const phaseCadence: Record<PhaseKey, { focus: string }> = {
  coreA: { focus: "New concept teaching, pace ramping up through autumn." },
  autumnBreak: { focus: "Short autumn break — no teaching." },
  coreB: { focus: "Final new content of semester 1, teaching at peak pace." },
  finals: { focus: `School finals fortnight (${weekRangeLabel(18, 20)}) — exams only, no teaching sessions.` },
  midYearBreak: { focus: "Mid-year holiday — no teaching." },
  review: { focus: "Re-engage and consolidate prior learning, no heavy new content." },
  ramadan: { focus: "Ramadan (incl. Founding Day) — no instruction, plan for nothing." },
  eidFitr: { focus: "Eid al-Fitr break — no teaching." },
  revisionA: { focus: "Applied practice and revision, the main exam-readiness push." },
  eidAdha: { focus: "Eid al-Adha break — no teaching." },
  revisionB: { focus: "Final revision and exam readiness before the year-end finals." },
  finalsS2: { focus: `School finals fortnight (${weekRangeLabel(42, 44)}) — exams only, no teaching sessions.` },
};

// Month ticks for the calendar axis (approx week each month starts).
export const monthTicks: { label: string; week: number }[] = [
  { label: "Aug", week: 0 },
  { label: "Sep", week: 2 },
  { label: "Oct", week: 6 },
  { label: "Nov", week: 10 },
  { label: "Dec", week: 15 },
  { label: "Jan", week: 19 },
  { label: "Feb", week: 23 },
  { label: "Mar", week: 28 },
  { label: "Apr", week: 32 },
  { label: "May", week: 36 },
  { label: "Jun", week: 41 },
];

// How the year is meant to feel for students, per grade · semester.
export const semesterMood: Record<Grade, Record<1 | 2, string>> = {
  10: { 1: "Foundation", 2: "Review" },
  11: { 1: "Strategy", 2: "Personalisation" },
  12: { 1: "", 2: "" },
};

// The broad goal for each grade · semester — a single line of copy shown
// under the semester label.
export const semesterGoal: Record<Grade, Record<1 | 2, string>> = {
  10: { 1: "Ease into Qudrat", 2: "Get a taste + identity" },
  11: { 1: "Strategise", 2: "Drill down with personalised practice" },
  12: { 1: "", 2: "" },
};

export const semesters: { label: string; weekStart: number; weekEnd: number; note: string }[] = [
  { label: "Semester 1", weekStart: 0, weekEnd: 20, note: "Core instruction · Aug–Jan" },
  { label: "Semester 2", weekStart: 22, weekEnd: 44, note: "Review + revision · Jan–Jun" },
];

// ----- Layer 2: momentum / effort curve ------------------------------------

export interface MomentumSeg {
  phase: PhaseKey;
  weekStart: number;
  weekEnd: number;
  effortIn: number;
  effortOut: number;
  dead?: boolean;
}

// Effort builds during teaching, then plummets THE MOMENT a break starts
// (segments share the boundary week, so the polyline drops vertically there).
export const momentum: MomentumSeg[] = [
  { phase: "coreA", weekStart: 0, weekEnd: 13, effortIn: 0.3, effortOut: 0.92 },
  { phase: "autumnBreak", weekStart: 13, weekEnd: 14, effortIn: 0, effortOut: 0, dead: true },
  { phase: "coreB", weekStart: 14, weekEnd: 18, effortIn: 0.6, effortOut: 0.92 },
  { phase: "finals", weekStart: 18, weekEnd: 20, effortIn: 0.97, effortOut: 0.97 },
  { phase: "midYearBreak", weekStart: 20, weekEnd: 22, effortIn: 0, effortOut: 0, dead: true },
  { phase: "review", weekStart: 22, weekEnd: 24, effortIn: 0.2, effortOut: 0.55 },
  { phase: "ramadan", weekStart: 24, weekEnd: 28, effortIn: 0, effortOut: 0, dead: true },
  { phase: "eidFitr", weekStart: 28, weekEnd: 30, effortIn: 0, effortOut: 0, dead: true },
  { phase: "revisionA", weekStart: 30, weekEnd: 37, effortIn: 0.25, effortOut: 0.9 },
  { phase: "eidAdha", weekStart: 37, weekEnd: 39, effortIn: 0, effortOut: 0, dead: true },
  { phase: "revisionB", weekStart: 39, weekEnd: 44, effortIn: 0.4, effortOut: 0.98 },
];

// Sampled momentum polyline (one point per week) for smooth area/line drawing.
function sampleMomentum(segs: MomentumSeg[]): { week: number; value: number }[] {
  const pts: { week: number; value: number }[] = [];
  for (const seg of segs) {
    const span = seg.weekEnd - seg.weekStart || 1;
    for (let w = seg.weekStart; w <= seg.weekEnd; w++) {
      const t = (w - seg.weekStart) / span;
      pts.push({ week: w, value: seg.effortIn + (seg.effortOut - seg.effortIn) * t });
    }
  }
  return pts;
}
export function momentumPoints(): { week: number; value: number }[] {
  return sampleMomentum(momentum);
}

// ----- Realistic momentum for the /test view --------------------------------
// Two differences from the schematic curve above:
//  1. Breaks dip LOW but never hit the floor — students still have work to do
//     and may attend school (especially across the semester-2 review period).
//  2. Grade 11's semester 2 follows the Strategy+ narrative: a high CRAM block,
//     a drop-off through Ramadan, then a steady ramp that tops out below the
//     earlier peak (the final real attempt, not a fresh climb to 100%).
const BREAK_FLOOR = 0.2; // breaks sit here instead of zero

const testMomentumG10: MomentumSeg[] = [
  { phase: "coreA", weekStart: 0, weekEnd: 13, effortIn: 0.3, effortOut: 0.92 },
  { phase: "autumnBreak", weekStart: 13, weekEnd: 14, effortIn: BREAK_FLOOR, effortOut: BREAK_FLOOR },
  { phase: "coreB", weekStart: 14, weekEnd: 18, effortIn: 0.6, effortOut: 0.92 },
  { phase: "finals", weekStart: 18, weekEnd: 20, effortIn: 0.97, effortOut: 0.97 },
  { phase: "midYearBreak", weekStart: 20, weekEnd: 22, effortIn: BREAK_FLOOR, effortOut: BREAK_FLOOR },
  { phase: "review", weekStart: 22, weekEnd: 24, effortIn: 0.4, effortOut: 0.6 },
  { phase: "ramadan", weekStart: 24, weekEnd: 28, effortIn: 0.32, effortOut: 0.24 },
  { phase: "eidFitr", weekStart: 28, weekEnd: 30, effortIn: 0.24, effortOut: 0.3 },
  { phase: "revisionA", weekStart: 30, weekEnd: 37, effortIn: 0.4, effortOut: 0.9 },
  { phase: "eidAdha", weekStart: 37, weekEnd: 39, effortIn: 0.45, effortOut: 0.38 },
  { phase: "revisionB", weekStart: 39, weekEnd: 44, effortIn: 0.5, effortOut: 0.98 },
];

const testMomentumG11: MomentumSeg[] = [
  // semester 1 mirrors G10
  { phase: "coreA", weekStart: 0, weekEnd: 13, effortIn: 0.3, effortOut: 0.92 },
  { phase: "autumnBreak", weekStart: 13, weekEnd: 14, effortIn: BREAK_FLOOR, effortOut: BREAK_FLOOR },
  { phase: "coreB", weekStart: 14, weekEnd: 18, effortIn: 0.6, effortOut: 0.92 },
  { phase: "finals", weekStart: 18, weekEnd: 20, effortIn: 0.97, effortOut: 0.97 },
  { phase: "midYearBreak", weekStart: 20, weekEnd: 22, effortIn: BREAK_FLOOR, effortOut: BREAK_FLOOR },
  // semester 2 = Strategy+ : CRAM high → Ramadan drop-off → steady ramp (not to peak)
  { phase: "review", weekStart: 22, weekEnd: 24, effortIn: 0.85, effortOut: 0.82 }, // CRAM block stays high
  { phase: "ramadan", weekStart: 24, weekEnd: 28, effortIn: 0.32, effortOut: 0.18 }, // drops off
  { phase: "eidFitr", weekStart: 28, weekEnd: 30, effortIn: 0.2, effortOut: 0.28 },
  { phase: "revisionA", weekStart: 30, weekEnd: 37, effortIn: 0.4, effortOut: 0.66 }, // ramps up
  { phase: "eidAdha", weekStart: 37, weekEnd: 39, effortIn: 0.36, effortOut: 0.3 }, // dips for the break
  { phase: "revisionB", weekStart: 39, weekEnd: 44, effortIn: 0.42, effortOut: 0.8 }, // tops out below the S1 peak
];

export function testMomentumPoints(grade: Grade): { week: number; value: number }[] {
  return sampleMomentum(grade === 11 ? testMomentumG11 : testMomentumG10);
}

// ----- Layer 3: academic structure -----------------------------------------

export type Grade = 10 | 11 | 12;
export type EventType = "diagnostic" | "waypoint" | "mock" | "realAttempt" | "milestone" | "exam" | "yearExam" | "tournament";
export type LaneKey = "recovery" | "onTrack" | "club";

// Top-level subject tracks, each shown as its own row beneath the calendar.
// Components (events) belong to one track; Tahsili / English start empty and
// get populated as their components are added.
export type Track = "qudrat" | "tahsili" | "english";
// Default render = Qudrat only (the clean main view). `tracksEsl` adds the ESL
// lane underneath and is used by the separate /esl route.
export const tracks: Track[] = ["qudrat"];
export const tracksEsl: Track[] = ["qudrat", "english"];
// The /test route adds the Tahsili lane below Qudrat (Qudrat greys out in G12,
// Tahsili greys out in G10/G11 and mirrors the G10 Qudrat structure in G12).
export const tracksTest: Track[] = ["qudrat", "tahsili"];
// `grades` = the grades a track is active for; other grades render greyed out
// (e.g. Tahsili only begins in grade 12; Qudrat is done by then).
export const trackMeta: Record<Track, { label: string; grades: Grade[] }> = {
  qudrat: { label: "Qudrat", grades: [10, 11] },
  tahsili: { label: "Tahsili", grades: [12] },
  english: { label: "English", grades: [10, 11, 12] },
};

// Each subject can run its own calendar sections. They share the default
// `phases` skeleton for now, but any track can be given a different phase list
// (e.g. English may not have a "Core instruction" block). Edit per track here.
export const trackPhases: Record<Track, Phase[]> = {
  qudrat: phases,
  tahsili: phases,
  english: phases,
};

// Grade-specific "Pre mock bootcamp" bands: a hatched overlay across the lanes
// for an intensive run-in to a mock. Half-open week range [weekStart, weekEnd).
// These are per-grade (the shared `phases` skeleton can't express them), so they
// render as an overlay on top of the calendar.
export interface BootcampBand {
  grade: Grade;
  weekStart: number;
  weekEnd: number;
  label: string;
}
export const bootcampBands: BootcampBand[] = [
  // The two weeks before each grade's year-end mock.
  { grade: 10, weekStart: 39, weekEnd: 41, label: "Pre mock bootcamp" },
  { grade: 11, weekStart: 39, weekEnd: 41, label: "Pre mock bootcamp" },
  // Grade 11 semester 1 — the two weeks before the end-of-S1 mock.
  { grade: 11, weekStart: 14, weekEnd: 16, label: "Pre mock bootcamp" },
  // Grade 11 semester 2 — the run-in to the April mock + real-attempt window.
  { grade: 11, weekStart: 31, weekEnd: 33, label: "Pre mock bootcamp" },
];

// Grade 12 Tahsili semester-2 review: two weeks per subject. Like the bootcamp
// bands these are grade+track-specific overlays the shared `phases` skeleton
// can't express. Half-open week range [weekStart, weekEnd). The subject order
// follows the best practices set by the other Tahsili courses.
// One colour per Tahsili subject, shared by the subject EOC circles and that
// subject's semester-2 review band so the two read as a matched pair. Keyed by
// the event `short` (also the subject name).
export const tahsiliSubjectColor: Record<string, string> = {
  Biochem: "#0d9488",
  Physics: "#2563eb",
  Math: "#7c3aed",
};
export interface SubjectReviewBand {
  grade: Grade;
  track: Track;
  weekStart: number;
  weekEnd: number;
  subject: string;   // matches the EOC `short` — drives the shared colour
  label: string;
}
export const subjectReviewBands: SubjectReviewBand[] = [
  { grade: 12, track: "tahsili", weekStart: 22, weekEnd: 24, subject: "Biochem", label: "Biochem review" },
  { grade: 12, track: "tahsili", weekStart: 30, weekEnd: 32, subject: "Physics", label: "Physics review" },
  { grade: 12, track: "tahsili", weekStart: 32, weekEnd: 34, subject: "Math", label: "Math review" },
];
export const phasesFor = (track: Track): Phase[] => trackPhases[track];

export interface TopicScore {
  topic: string;
  subject: "verbal" | "quant";
  score: number; // 0-100
}

export interface JourneyEvent {
  id: string;
  grade: Grade;
  type: EventType;
  label: string;
  short: string;
  week: number;
  phase: PhaseKey;
  semester: 1 | 2;
  track?: Track;    // subject row; defaults to "qudrat" when omitted
  summary: string;
  detail: string;
  covers?: string;
  target?: number;
  current?: number;
  topics?: TopicScore[];
  branch?: boolean; // after this event the journey branches into lanes
}

export const eventTypeMeta: Record<EventType, { label: string; color: string }> = {
  diagnostic: { label: "Diagnostic", color: "#7c3aed" },
  waypoint: { label: "Section exam", color: "#2563eb" },
  mock: { label: "Mock", color: "#0891b2" },
  realAttempt: { label: "Real attempt", color: "#16a34a" },
  milestone: { label: "Milestone", color: "#475569" },
  exam: { label: "Semester exam", color: "#db2777" },
  yearExam: { label: "Year exam", color: "#4338ca" },
  tournament: { label: "Tournament", color: "#ffffff" },
};

export const laneMeta: Record<LaneKey, { label: string; color: string; desc: string }> = {
  club: { label: "90+ Club", color: "#c026d3", desc: "Acceleration lane. Entered at 90+ in both verbal & quant. Focus shifts to exam technique and speed." },
  onTrack: { label: "On-track", color: "#475569", desc: "Default path. Continue the main sequence toward target." },
  recovery: { label: "Recovery", color: "#ea580c", desc: "Remedial review. Entered when struggling. What to recover is read off the heatmap (strong/weak per topic)." },
};

export interface LaneTask {
  title: string;
  kind: string;
  detail: string;
}

export interface LaneInfo {
  key: LaneKey;
  entry: string;
  focus: string;
  cadence: string;
  tasks: LaneTask[];
}

// What each lane actually means in practice during semester 2 (grade 11).
// Recovery and 90+ Club are mixes of independent practice tasks the student
// works through; Recovery's set is chosen off the heatmap's weak topics.
export const laneInfo: Record<LaneKey, LaneInfo> = {
  club: {
    key: "club",
    entry: "Scored 90+ in BOTH verbal and quant on the previous real attempt.",
    focus: "Stop learning content — convert accuracy into speed and exam technique, push toward 95+.",
    cadence: "Weekly, alongside the booked real attempts.",
    tasks: [
      { title: "Full timed papers", kind: "Independent", detail: "Full-length Qudrat papers under strict exam conditions to lock in pacing." },
      { title: "Speed drills", kind: "Independent", detail: "Time-per-question targets on the hardest topics; beat the clock, not the content." },
      { title: "Technique clinics", kind: "Guided", detail: "Elimination, trap-spotting and answer-prediction strategy sessions." },
      { title: "Stretch set (95+)", kind: "Independent", detail: "Top-difficulty question banks to chase the ceiling." },
      { title: "Peer teaching", kind: "Social", detail: "Explain worked solutions to others to consolidate mastery." },
    ],
  },
  onTrack: {
    key: "onTrack",
    entry: "Default — neither struggling nor at 90+ in both subjects.",
    focus: "Stay on the main sequence and keep climbing toward the target score.",
    cadence: "Continuous, with each booked real attempt.",
    tasks: [
      { title: "Continue main sequence", kind: "Guided", detail: "Planned content + mixed practice on the standard path." },
      { title: "Balanced practice", kind: "Independent", detail: "Even coverage across all verbal and quant topics." },
      { title: "Scheduled real attempts", kind: "Exam", detail: "Sit each booked attempt on cadence and review the result." },
      { title: "Light gap-fill", kind: "Independent", detail: "Shore up any single sub-threshold topic flagged by the heatmap." },
    ],
  },
  recovery: {
    key: "recovery",
    entry: "Struggled on the previous real attempt — below the on-track threshold.",
    focus: "Rebuild weak topics with a mix of independent practice tasks, chosen straight off the heatmap.",
    cadence: "Tight loop: practise → re-quiz → re-check the heatmap until the topic clears.",
    tasks: [
      { title: "Targeted practice sets", kind: "Independent", detail: "15–20 question sets on each weakest topic the heatmap flags (e.g. geometry, contextual error)." },
      { title: "Worked-example review", kind: "Independent", detail: "Step through solved examples for the exact question types that were missed." },
      { title: "Foundational micro-lessons", kind: "Guided", detail: "Short re-teach clips on the broken underlying concept before re-practising." },
      { title: "Low-stakes re-quizzes", kind: "Independent", detail: "Re-test the topic repeatedly until it crosses the recovery threshold." },
      { title: "Spaced review", kind: "Independent", detail: "Revisit recovered topics on a spacing schedule so they don't slip back." },
    ],
  },
};

// Grade-11 semester-2 branches off Real attempt #1 into two divergent paths.
// Each path runs its own set of milestones through semester 2.
export type BranchKey = "club" | "recovery";

// A labelled sub-period inside a branch path (half-open: [weekStart, weekEnd)).
export interface BranchBand {
  label?: string;   // optional pill; omit to just shade the weeks
  weekStart: number;
  weekEnd: number;
  color?: string;   // overrides the path colour (e.g. a blue "learning" stretch)
}
// A plotted item on a branch path, coloured by its event type.
export interface BranchEvent {
  week: number;
  short: string;
  label: string;
  type: EventType;
  summer?: boolean;   // plotted in the summer-break strip (July attempt window)
}

// Richer detail shown in a path's popover (currently the 90+ Club advanced path).
export interface AdvancedPath {
  intro: string;
  scenarios: { when: string; then: string }[];
  agreement: string;
}

export interface BranchPath {
  key: BranchKey;
  label: string;
  color: string;
  desc: string;
  bands: BranchBand[];      // labelled sub-periods (e.g. "Cram")
  events: BranchEvent[];    // plotted milestones; same-week events stack
  options: string[];        // forked choices (no fixed week) — e.g. 90+ Club's two routes
  advanced?: AdvancedPath;  // extra popover detail (90+ Club)
}

export const g11Branches: BranchPath[] = [
  {
    key: "club",
    label: "90+ Club",
    color: "#0d9488",
    desc: "For students who scored 90+ in both verbal and quant on Real attempt #1. Content learning is done — from here they pick how to spend the runway.",
    bands: [],
    events: [],
    options: [
      "Keep improving — 90+ class review",
      "Switch focus — Tahsili self-study / capstone",
    ],
    advanced: {
      intro: "For 90+ Club students who want to keep improving their grade: they're encouraged to stay in a dedicated 90+ class review, designed to be more challenging than the standard track.",
      scenarios: [
        { when: "Achieved their Qudrat goal post-S1", then: "Move onto a Tahsili self-study plan or project." },
        { when: "Achieved their Qudrat goal late in S2", then: "They get their time back — we recommend a capstone project." },
      ],
      agreement: "Either way, create a mutual agreement with parents for the chosen path.",
    },
  },
  {
    key: "recovery",
    label: "Strategy +",
    color: "#0f172a",
    desc: "For students below the on-track threshold on Real attempt #1. Semester 2 opens with an orientation week and review before Ramadan, then runs toward two booked Qudrat windows: one in April and a final one in July.",
    bands: [],
    events: [
      { week: 33, short: "Mock", label: "Mock — before the April attempt", type: "mock" },
      { week: 35, short: "2", label: "Real attempt #2 · April window", type: "realAttempt" },
      { week: 41, short: "Mock", label: "Mock — June, before the July attempt", type: "mock" },
      { week: 44, short: "3", label: "Real attempt #3 · July window · Best score", type: "realAttempt", summer: true },
    ],
    options: [],
  },
];

// Reusable sample heatmaps -------------------------------------------------

function topics(v: number[], q: number[]): TopicScore[] {
  const verbal = ["Reading comprehension", "Sentence completion", "Verbal analogy", "Contextual error", "Sentence correction"];
  const quant = ["Arithmetic", "Algebra", "Geometry", "Statistics", "Quantitative comparison"];
  return [
    ...verbal.map((t, i) => ({ topic: t, subject: "verbal" as const, score: v[i] })),
    ...quant.map((t, i) => ({ topic: t, subject: "quant" as const, score: q[i] })),
  ];
}

// ----- Grade 10: foundations + review --------------------------------------

export const grade10: JourneyEvent[] = [
  {
    id: "g10-diag", grade: 10, type: "diagnostic", label: "Join diagnostic", short: "Diagnostic",
    week: 0, phase: "coreA", semester: 1,
    summary: "Baseline on entry. Sets the starting picture of strengths and gaps.",
    detail: "Sat in the first week of Block A. Establishes the grade-10 baseline across verbal and quantitative before any concept teaching lands. Feeds the heatmap that drives everything downstream.",
    covers: "Pre-teaching baseline, all topics sampled",
    topics: topics([42, 38, 30, 35, 28], [48, 40, 33, 30, 36]),
  },
  {
    id: "g10-wp1", grade: 10, type: "waypoint", label: "Section exam 1", short: "EOC 1",
    week: 5, phase: "coreA", semester: 1,
    summary: "First round-up. ~1.x chapters pulled from across the four, not chapter-bound.",
    detail: "Mid Block A. Round-up exam #1 of semester one. Checks retention of the first concept cluster while momentum is still climbing.",
    covers: "≈1.3 chapters, mixed",
    topics: topics([55, 50, 44, 47, 42], [60, 52, 45, 41, 48]),
  },
  {
    id: "g10-wp2", grade: 10, type: "waypoint", label: "Section exam 2", short: "EOC 2",
    week: 11, phase: "coreA", semester: 1,
    summary: "Second round-up at the end of Block A, near the first momentum peak.",
    detail: "End of Block A, just before the short break. Round-up exam #2. Densest learning has landed by now — this is a high-signal checkpoint.",
    covers: "≈1.5 chapters, mixed",
    topics: topics([64, 61, 52, 55, 50], [69, 60, 54, 49, 57]),
  },
  {
    id: "g10-wp3", grade: 10, type: "waypoint", label: "Section exam 3", short: "EOC 3",
    week: 17, phase: "coreB", semester: 1,
    summary: "Third round-up, sat in the last teaching week before the school finals.",
    detail: "Round-up exam #3, the final section exam of the evenly-spaced trio — sat in the last teaching week before the school finals fortnight. A high-signal checkpoint on retention across the four chapters.",
    covers: "Cumulative, all four chapters",
    target: 75, current: 68,
    topics: topics([72, 70, 60, 63, 58], [78, 71, 62, 55, 66]),
  },
  {
    id: "g10-tournament", grade: 10, type: "tournament", label: "Qudrat tournament", short: "Tou",
    week: 40, phase: "revisionB", semester: 2,
    summary: "End-of-year Qudrat tournament, sat alongside the grade-10 mock.",
    detail: "A competitive Qudrat tournament at the end of semester 2, the same week as the grade-10 mock. A high-energy close to the foundations year.",
    covers: "Everything (grade 10)",
  },
  {
    id: "g10-mock", grade: 10, type: "mock", label: "Grade 10 mock", short: "Mock",
    week: 41, phase: "revisionB", semester: 2,
    summary: "Full mock covering everything — the final action of grade 10.",
    detail: "Sat at the very end of Block D, the last action of the grade-10 year. Covers all of grade-10 content. Closes the foundations year and sets the summer-decay expectation going into grade 11.",
    covers: "Everything (grade 10)",
    target: 80, current: 74,
    topics: topics([78, 75, 68, 70, 66], [82, 77, 70, 63, 72]),
  },
  // English track
  {
    id: "g10-en-diag", grade: 10, type: "diagnostic", label: "English diagnostic", short: "Diagnostic",
    week: 0, phase: "coreA", semester: 1, track: "english",
    summary: "Baseline English level on entry to grade 10.",
    detail: "Sat in the first week alongside the Qudrat diagnostic. Establishes the starting English level to plan the year against.",
    covers: "English baseline (all skills)",
  },
  {
    id: "g10-en-eos", grade: 10, type: "exam", label: "End-of-semester exam", short: "EoS",
    week: 17, phase: "coreB", semester: 1, track: "english",
    summary: "Semester-1 English exam, sat after the Qudrat mock and before the finals fortnight.",
    detail: "The summative English exam closing semester 1, sat after the semester-1 Qudrat mock and just before the finals fortnight.",
    covers: "All of semester-1 English",
  },
  {
    id: "g10-en-eoy", grade: 10, type: "yearExam", label: "End-of-year exam", short: "EoY",
    week: 41, phase: "revisionB", semester: 2, track: "english",
    summary: "End-of-year English exam, around the time of the grade-10 Qudrat mock.",
    detail: "The summative end-of-year English exam, sat around the same time as the grade-10 Qudrat mock (and never before it).",
    covers: "All of grade-10 English",
  },
];

// ----- Grade 11: real attempts ---------------------------------------------

export const grade11: JourneyEvent[] = [
  {
    id: "g11-diag", grade: 11, type: "diagnostic", label: "Entry diagnostic", short: "Diagnostic",
    week: 0, phase: "coreA", semester: 1,
    summary: "Re-baseline on entry, accounts for summer decay.",
    detail: "First week of Block A. Re-establishes the picture after the summer break — expect decay versus the grade-10 mock. Resets the heatmap for the real-attempt year.",
    covers: "Post-summer baseline",
    topics: topics([66, 62, 55, 58, 52], [70, 64, 57, 50, 60]),
  },
  {
    id: "g11-wp1", grade: 11, type: "waypoint", label: "Section exam 1", short: "EOC 1",
    week: 4, phase: "coreA", semester: 1,
    summary: "Re-covering concepts, round-up #1.",
    detail: "Mid Block A. Reinforces the first concept cluster at grade-11 depth.",
    covers: "≈1.3 chapters, mixed",
    topics: topics([72, 68, 62, 64, 60], [76, 70, 63, 57, 66]),
  },
  {
    id: "g11-wp2", grade: 11, type: "waypoint", label: "Section exam 2", short: "EOC 2",
    week: 8, phase: "coreA", semester: 1,
    summary: "Round-up #2 near the Block A peak.",
    detail: "End of Block A. High-signal checkpoint before the short break.",
    covers: "≈1.5 chapters, mixed",
    topics: topics([78, 75, 68, 70, 66], [82, 76, 69, 62, 72]),
  },
  {
    id: "g11-wp3", grade: 11, type: "waypoint", label: "Section exam 3", short: "EOC 3",
    week: 12, phase: "coreA", semester: 1,
    summary: "Last section exam before the end-of-S1 mock.",
    detail: "Final section-level readiness check ahead of the full semester-1 mock.",
    covers: "Cumulative, all four chapters",
    target: 85, current: 80,
    topics: topics([82, 80, 73, 75, 71], [86, 81, 74, 67, 77]),
  },
  {
    id: "g11-tournament", grade: 11, type: "tournament", label: "Qudrat tournament", short: "Tou",
    week: 15, phase: "coreB", semester: 1,
    summary: "End-of-semester-1 Qudrat tournament — sat the same week as the S1 mock.",
    detail: "A competitive Qudrat tournament in the last teaching week of semester 1, alongside the S1 mock and the first real attempt. Students compete on speed and accuracy for recognition before the finals fortnight.",
    covers: "All of semester 1",
  },
  {
    id: "g11-mock1", grade: 11, type: "mock", label: "End of S1 mock", short: "Mock",
    week: 16, phase: "coreB", semester: 1,
    summary: "Full mock closing semester 1, sat before the finals fortnight.",
    detail: "A full-length mock that closes semester 1 — sat before the finals fortnight — setting the readiness baseline going into the first booked, externally-sat Qudrat attempt.",
    covers: "Cumulative, all four chapters",
    target: 85, current: 80,
    topics: topics([83, 81, 74, 76, 72], [87, 82, 75, 68, 78]),
  },
  {
    id: "g11-real1", grade: 11, type: "realAttempt", label: "Real attempt #1", short: "Real #1",
    week: 17, phase: "coreB", semester: 1,
    // R1 is sat at the end of December — just after the S1 mock, before the school finals; R2 follows at the end of April.
    summary: "First real Qudrat — sat externally end of December, just after the mock. Branch point.",
    detail: "The first real, externally-sat Qudrat attempt at the end of December — straight after the semester-1 mock and before the school finals fortnight. Performance here branches the journey: struggling → Recovery, 90+ both subjects → 90+ Club, otherwise → On-track.",
    covers: "Full Qudrat (verbal + quant)",
    target: 85, current: 79,
    branch: true,
    topics: topics([81, 79, 72, 74, 70], [84, 80, 73, 66, 76]),
  },
  {
    id: "g11-real2", grade: 11, type: "realAttempt", label: "Real attempt #2 · Best score", short: "Real #2",
    week: 35, phase: "revisionA", semester: 2,
    summary: "Second real attempt at the end of April — best Qudrat score is the goal.",
    detail: "The second real, externally-sat Qudrat attempt at the end of April, after the post-Ramadan revision push. The objective of grade 11 is the best Qudrat score by year end — this is the last booked sitting.",
    covers: "Full Qudrat",
    target: 92, current: 88,
    topics: topics([90, 88, 84, 85, 82], [92, 89, 85, 79, 87]),
  },
  // English track — opens with a mock, S2 mirrors grade 10
  {
    id: "g11-en-mock", grade: 11, type: "mock", label: "IELTS / STEP mock", short: "Mock",
    week: 0, phase: "coreA", semester: 1, track: "english",
    summary: "Opening IELTS / STEP mock at the very start of semester 1.",
    detail: "Grade 11 English opens with a full IELTS / STEP-style mock in the first week of semester 1 to set the baseline.",
    covers: "IELTS / STEP (full mock)",
  },
  {
    id: "g11-en-eos", grade: 11, type: "exam", label: "End-of-semester exam", short: "EoS",
    week: 17, phase: "coreB", semester: 1, track: "english",
    summary: "Semester-1 English exam, sat after the Qudrat mock and before the finals fortnight.",
    detail: "The summative semester-1 English exam, sat after the semester-1 Qudrat mock and just before the finals fortnight.",
    covers: "All of semester-1 English",
  },
  {
    id: "g11-en-eoy", grade: 11, type: "yearExam", label: "End-of-year exam", short: "EoY",
    week: 41, phase: "revisionB", semester: 2, track: "english",
    summary: "End-of-year English exam — same placement as grade 10.",
    detail: "The summative end-of-year English exam, mirroring grade 10: sat around the same time as the year-end Qudrat attempt.",
    covers: "All of grade-11 English",
  },
];

// ----- Grade 12: tahsili (thin, unspecified) -------------------------------

export const grade12: JourneyEvent[] = [
  {
    id: "g12-diag", grade: 12, type: "diagnostic", label: "Tahsili diagnostic", short: "Diagnostic",
    week: 0, phase: "coreA", semester: 1, track: "tahsili",
    summary: "Baseline for the subject-based achievement test (biochem, physics, math).",
    detail: "Qudrat is done. Tahsili runs subject-focused: semester 1 re-teaches grade-10 and grade-11 material to solidify foundations, then semester 2 reviews everything. Each EOC and each review block targets one subject (biochem, physics, math). Note: the exact sequence of subjects will follow the best practices established by the other Tahsili courses.",
    covers: "Biochem · Physics · Math (baseline)",
  },
  {
    id: "g12-wp1", grade: 12, type: "waypoint", label: "Biochem EOC", short: "Biochem",
    week: 5, phase: "coreA", semester: 1, track: "tahsili",
    summary: "Subject-focused EOC on the re-taught biochem foundations.",
    detail: "Mid Block A. The first subject-focused section exam, on the re-taught grade-10/11 biochem material. Note: the subject order across the EOCs follows the best practices set by the other Tahsili courses.",
    covers: "Biochem (re-taught foundations)",
  },
  {
    id: "g12-wp2", grade: 12, type: "waypoint", label: "Physics EOC", short: "Physics",
    week: 11, phase: "coreA", semester: 1, track: "tahsili",
    summary: "Subject-focused EOC on the re-taught physics foundations.",
    detail: "End of Block A, just before the short break. The second subject-focused section exam, on the re-taught grade-10/11 physics material.",
    covers: "Physics (re-taught foundations)",
  },
  {
    id: "g12-wp3", grade: 12, type: "waypoint", label: "Math EOC", short: "Math",
    week: 17, phase: "coreB", semester: 1, track: "tahsili",
    summary: "Subject-focused EOC on the re-taught math foundations.",
    detail: "The third subject-focused section exam, on the re-taught grade-10/11 math material — sat in the last teaching week before the school finals fortnight.",
    covers: "Math (re-taught foundations)",
  },
  {
    id: "g12-mock", grade: 12, type: "mock", label: "Grade 12 mock", short: "Mock",
    week: 35, phase: "revisionA", semester: 2, track: "tahsili",
    summary: "Full Tahsili mock at the end of April, after the subject reviews.",
    detail: "Sat at the end of April, once the subject-by-subject reviews have run. A full mock across all subjects before the final run-in to the year-end finals.",
    covers: "Everything (grade 12 Tahsili)",
  },
  // English track — same as grade 11
  {
    id: "g12-en-mock", grade: 12, type: "mock", label: "IELTS / STEP mock", short: "Mock",
    week: 0, phase: "coreA", semester: 1, track: "english",
    summary: "Opening IELTS / STEP mock at the very start of semester 1.",
    detail: "Grade 12 English opens with a full IELTS / STEP-style mock in the first week of semester 1 to set the baseline.",
    covers: "IELTS / STEP (full mock)",
  },
  {
    id: "g12-en-eos", grade: 12, type: "exam", label: "End-of-semester exam", short: "EoS",
    week: 17, phase: "coreB", semester: 1, track: "english",
    summary: "Semester-1 English exam, sat before the finals fortnight.",
    detail: "The summative semester-1 English exam, sat just before the finals fortnight.",
    covers: "All of semester-1 English",
  },
  {
    id: "g12-en-eoy", grade: 12, type: "yearExam", label: "End-of-year exam", short: "EoY",
    week: 41, phase: "revisionB", semester: 2, track: "english",
    summary: "End-of-year English exam — same placement as grade 11.",
    detail: "The summative end-of-year English exam, sat near the end of the year.",
    covers: "All of grade-12 English",
  },
];

export const gradeEvents: Record<Grade, JourneyEvent[]> = {
  10: grade10,
  11: grade11,
  12: grade12,
};

export const gradeMeta: Record<Grade, { title: string; subject: string; theme: string }> = {
  10: { title: "Grade 10", subject: "Qudrat · Verbal + Quantitative", theme: "Foundations + review" },
  11: { title: "Grade 11", subject: "Qudrat · Verbal + Quantitative", theme: "Real attempts" },
  12: { title: "Grade 12", subject: "Tahsili · Bio / Chem / Physics / Math", theme: "Achievement test (thin)" },
};

// Main view = G10 + G11. The ESL route additionally shows G12 (Qudrat is done
// by then — its lane greys out — while English continues).
export const grades: Grade[] = [10, 11];
export const gradesEsl: Grade[] = [10, 11, 12];
// The /test route also shows G12 (for the Tahsili lane, which mirrors G10 Qudrat).
export const gradesTest: Grade[] = [10, 11, 12];

// Which grades have a branch into lanes during semester 2.
export function hasLanes(grade: Grade): boolean {
  return gradeEvents[grade].some((e) => e.branch);
}
