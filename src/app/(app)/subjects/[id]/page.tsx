import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, FileText, MessageSquareText } from "lucide-react";
import { DeleteSubjectButton, NotesUpload, ReplanButton } from "@/components/SubjectActions";
import { TaskRow, type TaskView } from "@/components/TaskRow";
import { formatDay, Importance, Meter, WeakBadge } from "@/components/ui";
import { todayISO, type PlanItem, type Subject, type Topic } from "@/lib/data";
import { daysBetween, isWeak, readiness } from "@/lib/planner";
import { requireUser } from "@/lib/supabase/server";

export default async function SubjectPage({ params }: PageProps<"/subjects/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const today = todayISO();

  const [{ data: subject }, { data: topics }, { data: items }, { data: docs }, { data: doubts }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", id).maybeSingle<Subject>(),
    supabase.from("topics").select("*").eq("subject_id", id).order("position").returns<Topic[]>(),
    supabase.from("plan_items").select("*").eq("subject_id", id).order("day").order("created_at").returns<PlanItem[]>(),
    supabase.from("documents").select("id, name, kind, page_count").eq("subject_id", id).order("created_at"),
    supabase.from("doubts").select("id, question_text").eq("subject_id", id).order("created_at", { ascending: false }),
  ]);
  if (!subject) notFound();

  const allTopics = topics ?? [];
  const topicName = new Map(allTopics.map((t) => [t.id, t.name]));
  const missed = (items ?? []).filter((i) => i.day < today && !i.done);

  // Upcoming plan grouped by day.
  const byDay = new Map<string, TaskView[]>();
  for (const i of items ?? []) {
    if (i.day < today) continue;
    const list = byDay.get(i.day) ?? [];
    list.push({ ...i, topicName: i.topic_id ? topicName.get(i.topic_id) ?? null : null });
    byDay.set(i.day, list);
  }
  const days = [...byDay.entries()];

  const units = new Map<string, Topic[]>();
  for (const t of allTopics) units.set(t.unit, [...(units.get(t.unit) ?? []), t]);

  const left = daysBetween(today, subject.exam_date);
  const score = readiness(allTopics);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{subject.name}</h1>
          <p className="text-slate-600">
            Exam on {new Date(subject.exam_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })} ·{" "}
            {left > 0 ? `${left} days left` : left === 0 ? "today!" : "finished"} · {subject.hours_per_day} h/day
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/subjects/${id}/chat`} className="btn-ghost">
            <MessageSquareText className="size-4" /> Chat with notes
          </Link>
          <Link href={`/doubt?subject=${id}`} className="btn-ghost">
            <Camera className="size-4" /> Snap a doubt
          </Link>
          <ReplanButton subjectId={id} />
          <DeleteSubjectButton subjectId={id} name={subject.name} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Exam readiness</h2>
          <span className="text-3xl font-bold tabular-nums">{score}%</span>
        </div>
        <div className="mt-2">
          <Meter value={score} label="Readiness" />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Goes up as you finish sessions and score well in quizzes. Doubts on a topic lower its mastery so the plan gives it more time.
        </p>
      </div>

      {missed.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            You missed {missed.length} session{missed.length === 1 ? "" : "s"}. No stress — re-plan to fit them into the days left.
          </p>
          <ReplanButton subjectId={id} highlight />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <h2 className="font-semibold">Study plan</h2>
          {days.length === 0 && <p className="mt-3 text-sm text-slate-500">No upcoming sessions.</p>}
          <div className="mt-4 space-y-5">
            {days.slice(0, 7).map(([day, tasks]) => (
              <DayBlock key={day} title={formatDay(day, today)} tasks={tasks} />
            ))}
          </div>
          {days.length > 7 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-indigo-600">
                Show the remaining {days.length - 7} days
              </summary>
              <div className="mt-4 space-y-5">
                {days.slice(7).map(([day, tasks]) => (
                  <DayBlock key={day} title={formatDay(day, today)} tasks={tasks} />
                ))}
              </div>
            </details>
          )}
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <h2 className="font-semibold">Topics</h2>
            <p className="text-xs text-slate-500">Stars = exam importance · bar = your mastery</p>
            <div className="mt-4 space-y-5">
              {[...units.entries()].map(([unit, list]) => (
                <div key={unit}>
                  <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{unit}</h3>
                  <ul className="mt-2 space-y-3">
                    {list.map((t) => (
                      <li key={t.id}>
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/practice/${t.id}`} className="min-w-0 truncate text-sm font-medium hover:text-indigo-700">
                            {t.name}
                          </Link>
                          <div className="flex shrink-0 items-center gap-2">
                            {isWeak(t) && <WeakBadge />}
                            <Importance value={t.importance} />
                          </div>
                        </div>
                        <Meter value={t.mastery} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="font-semibold">Notes &amp; documents</h2>
            <p className="text-xs text-slate-500">Used by &quot;Chat with notes&quot; and quizzes</p>
            <ul className="mt-3 space-y-2">
              {docs?.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <span className="text-xs text-slate-500">{d.page_count} pages</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <NotesUpload subjectId={id} />
            </div>
          </section>

          {!!doubts?.length && (
            <section className="card">
              <h2 className="font-semibold">Doubts in this subject</h2>
              <ul className="mt-3 space-y-2">
                {doubts.map((d) => (
                  <li key={d.id}>
                    <Link href={`/doubts/${d.id}`} className="line-clamp-1 text-sm hover:text-indigo-700">
                      {d.question_text}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DayBlock({ title, tasks }: { title: string; tasks: TaskView[] }) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-500">
          {done}/{tasks.length} done
        </span>
      </div>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
    </div>
  );
}
