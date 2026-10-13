// The study-plan algorithm. Pure functions (no database), so it is easy to test.
//
// Idea: every topic gets a priority score from how important it is for the exam,
// how weak the student is in it, and how many doubts they asked on it.
// The days until the exam are split into 45-minute slots:
//   1. First, every topic that hasn't been learned yet gets a "learn" slot (in syllabus order).
//   2. The remaining slots are filled with "practice"/"revise" sessions, highest priority first.
//      After a topic is scheduled, its priority is halved so other topics get a turn.
//   3. The day before the exam is a mock test + revision day.
// When something changes (a missed day, a doubt, a quiz score), the future is re-planned.

export const SLOT_MINUTES = 45;

export type PlannerTopic = {
  id: string;
  position: number;
  importance: number; // 1-5
  mastery: number; // 0-100
  weak_count: number;
  learned: boolean;
};

export type PlannedTask = {
  topic_id: string | null;
  day: string; // YYYY-MM-DD
  task_type: "learn" | "revise" | "practice" | "mock";
  minutes: number;
};

export function priority(t: PlannerTopic) {
  return t.importance * (1 + (100 - t.mastery) / 50) + t.weak_count * 2;
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISO: string) {
  return Math.round((Date.parse(toISO + "T00:00:00Z") - Date.parse(fromISO + "T00:00:00Z")) / 86_400_000);
}

export function buildPlan(opts: {
  topics: PlannerTopic[];
  today: string;
  examDate: string;
  hoursPerDay: number;
  /** Minutes already completed today, so today's remaining capacity is smaller. */
  minutesDoneToday?: number;
}): PlannedTask[] {
  const { topics, today, examDate, hoursPerDay } = opts;
  const totalDays = daysBetween(today, examDate); // study days before the exam day
  if (totalDays <= 0 || topics.length === 0) return [];

  const slotsPerDay = Math.max(1, Math.round((hoursPerDay * 60) / SLOT_MINUTES));
  const doneSlotsToday = Math.floor((opts.minutesDoneToday ?? 0) / SLOT_MINUTES);

  // Keep the last day before the exam for a mock test, if there's more than one day.
  const studyDays = totalDays > 1 ? totalDays - 1 : totalDays;
  const days: { day: string; free: number }[] = [];
  for (let i = 0; i < studyDays; i++) {
    const free = i === 0 ? Math.max(0, slotsPerDay - doneSlotsToday) : slotsPerDay;
    days.push({ day: addDays(today, i), free });
  }
  const slots = days.flatMap((d) => Array.from({ length: d.free }, () => d.day));

  const tasks: PlannedTask[] = [];
  let next = 0;
  const take = (topic_id: string | null, task_type: PlannedTask["task_type"]) => {
    if (next >= slots.length) return false;
    tasks.push({ topic_id, day: slots[next++], task_type, minutes: SLOT_MINUTES });
    return true;
  };

  // 1. Learn everything not learned yet. If time is short, the most important topics go first.
  const toLearn = topics.filter((t) => !t.learned);
  const learnOrder =
    toLearn.length > slots.length
      ? [...toLearn].sort((a, b) => priority(b) - priority(a)).slice(0, slots.length)
      : toLearn;
  learnOrder.sort((a, b) => a.position - b.position).forEach((t) => take(t.id, "learn"));

  // 2. Fill remaining slots with practice and revision, by priority.
  //    A topic is never scheduled twice on the same day, when it can be avoided.
  const score = new Map(topics.map((t) => [t.id, priority(t)]));
  const timesScheduled = new Map<string, number>();
  while (next < slots.length) {
    const day = slots[next];
    const usedToday = new Set(tasks.filter((x) => x.day === day).map((x) => x.topic_id));
    const ranked = [...topics].sort((a, b) => score.get(b.id)! - score.get(a.id)!);
    const pick = ranked.find((t) => !usedToday.has(t.id)) ?? ranked[0];
    const n = timesScheduled.get(pick.id) ?? 0;
    take(pick.id, pick.mastery < 50 || n % 2 === 0 ? "practice" : "revise");
    timesScheduled.set(pick.id, n + 1);
    score.set(pick.id, score.get(pick.id)! / 2);
  }

  // 3. Mock test + revision of the weakest topics on the last day.
  if (totalDays > 1) {
    const lastDay = addDays(today, totalDays - 1);
    tasks.push({ topic_id: null, day: lastDay, task_type: "mock", minutes: SLOT_MINUTES * 2 });
    [...topics]
      .sort((a, b) => priority(b) - priority(a))
      .slice(0, Math.max(0, slotsPerDay - 2))
      .forEach((t) => tasks.push({ topic_id: t.id, day: lastDay, task_type: "revise", minutes: SLOT_MINUTES }));
  }
  return tasks;
}

// ───────────── Scores shown on the dashboard ─────────────

export type ScoredTopic = { importance: number; mastery: number; weak_count: number; last_quiz_score: number | null };

/** Exam readiness 0-100: mastery averaged over topics, weighted by importance. */
export function readiness(topics: ScoredTopic[]) {
  const weight = topics.reduce((s, t) => s + t.importance, 0);
  if (!weight) return 0;
  return Math.round(topics.reduce((s, t) => s + t.importance * t.mastery, 0) / weight);
}

export function isWeak(t: ScoredTopic) {
  return (t.weak_count > 0 && t.mastery < 70) || (t.last_quiz_score !== null && t.last_quiz_score < 50);
}

/** Consecutive days (ending today or yesterday) with any study activity. */
export function streak(activityDays: string[], today: string) {
  const set = new Set(activityDays);
  let day = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
