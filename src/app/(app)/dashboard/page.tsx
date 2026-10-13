import Link from "next/link";
import { ArrowRight, Camera, Plus, Sparkles } from "lucide-react";
import { TaskRow, type TaskView } from "@/components/TaskRow";
import { Importance, Meter, StatTile, WeakBadge } from "@/components/ui";
import { todayISO, type PlanItem, type Subject, type Topic } from "@/lib/data";
import { daysBetween, isWeak, readiness, streak } from "@/lib/planner";
import { requireUser } from "@/lib/supabase/server";

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const today = todayISO();

  const [{ data: subjects }, { data: topics }, { data: items }, { data: doubts }, { data: quizzes }] = await Promise.all([
    supabase.from("subjects").select("*").order("exam_date").returns<Subject[]>(),
    supabase.from("topics").select("*").returns<Topic[]>(),
    supabase.from("plan_items").select("*").returns<PlanItem[]>(),
    supabase.from("doubts").select("id, question_text, created_at, topic_id").order("created_at", { ascending: false }),
    supabase.from("quiz_attempts").select("created_at"),
  ]);

  if (!subjects?.length) {
    return (
      <div className="card mx-auto max-w-xl py-12 text-center">
        <Sparkles className="mx-auto size-10 text-indigo-500" />
        <h1 className="mt-4 text-2xl font-bold">Let&apos;s plan your first exam</h1>
        <p className="mt-2 text-slate-600">Add a subject, upload its syllabus and ExamPilot will build your study plan.</p>
        <Link href="/subjects/new" className="btn mt-6">
          <Plus className="size-4" /> Add your first subject
        </Link>
      </div>
    );
  }

  const allTopics = topics ?? [];
  const topicName = new Map(allTopics.map((t) => [t.id, t.name]));
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

  const todays: TaskView[] = (items ?? [])
    .filter((i) => i.day === today)
    .map((i) => ({ ...i, topicName: i.topic_id ? topicName.get(i.topic_id) ?? null : null, subjectName: subjectName.get(i.subject_id) }));
  const missed = (items ?? []).filter((i) => i.day < today && !i.done).length;

  const activity = [
    ...(items ?? []).filter((i) => i.done_at).map((i) => i.done_at!),
    ...(doubts ?? []).map((d) => d.created_at),
    ...(quizzes ?? []).map((q) => q.created_at),
  ].map((ts) => new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" }).format(new Date(ts)));

  const weakTopics = allTopics.filter(isWeak).sort((a, b) => b.importance - a.importance).slice(0, 6);
  const overall = readiness(allTopics);
  const doneToday = todays.filter((t) => t.done).length;
  const days = streak(activity, today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hi {user.email?.split("@")[0]} 👋</h1>
        <p className="text-slate-600">Here&apos;s your exam prep at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Overall readiness" value={`${overall}%`} hint="Mastery weighted by exam importance" />
        <StatTile label="Today's sessions" value={`${doneToday}/${todays.length}`} hint={todays.length ? "Keep going!" : "Nothing scheduled"} />
        <StatTile label="Study streak" value={`${days} day${days === 1 ? "" : "s"}`} hint="Days in a row with study activity" />
        <StatTile label="Doubts solved" value={String(doubts?.length ?? 0)} hint="With DoubtSnap" />
      </div>

      {missed > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You have {missed} unfinished session{missed === 1 ? "" : "s"} from earlier days. Open a subject and press{" "}
          <b>Re-plan</b> to spread them over the coming days.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="font-semibold">Today&apos;s plan</h2>
          {todays.length ? (
            <ul className="mt-4 space-y-2">
              {todays.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No sessions today. Take a quiz or snap a doubt to stay sharp.</p>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Weak topics</h2>
          <p className="text-xs text-slate-500">From your doubts and quiz scores</p>
          {weakTopics.length ? (
            <ul className="mt-4 space-y-3">
              {weakTopics.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-slate-500">{subjectName.get(t.subject_id)}</p>
                  </div>
                  <Link href={`/practice/${t.id}`} className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline">
                    Practice
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No weak topics yet 🎉</p>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-semibold">Your subjects</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const st = allTopics.filter((t) => t.subject_id === s.id);
            const left = daysBetween(today, s.exam_date);
            const top = [...st].sort((a, b) => b.importance - a.importance)[0];
            return (
              <Link key={s.id} href={`/subjects/${s.id}`} className="card block transition hover:border-indigo-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{s.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${left <= 3 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                    {left > 0 ? `${left} days left` : left === 0 ? "Exam today" : "Exam done"}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">Readiness</p>
                <Meter value={readiness(st)} label="Readiness" />
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{st.length} topics</span>
                  {top && (
                    <span className="flex items-center gap-1">
                      Most important: <Importance value={top.importance} />
                    </span>
                  )}
                </div>
                {st.some(isWeak) && (
                  <div className="mt-2">
                    <WeakBadge />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {!!doubts?.length && (
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent doubts</h2>
            <Link href="/doubt" className="flex items-center gap-1 text-sm font-semibold text-indigo-600">
              <Camera className="size-4" /> New
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {doubts.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Link href={`/doubts/${d.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-indigo-700">
                  <span className="line-clamp-1">{d.question_text}</span>
                  <ArrowRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
