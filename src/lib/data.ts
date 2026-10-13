import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import { buildPlan } from "./planner";

// Database helpers shared by pages, server actions and API routes.

export type Topic = {
  id: string;
  subject_id: string;
  unit: string;
  name: string;
  position: number;
  importance: number;
  mastery: number;
  weak_count: number;
  last_quiz_score: number | null;
};

export type PlanItem = {
  id: string;
  subject_id: string;
  topic_id: string | null;
  day: string;
  task_type: "learn" | "revise" | "practice" | "mock";
  minutes: number;
  done: boolean;
  done_at: string | null;
};

export type Subject = { id: string; name: string; exam_date: string; hours_per_day: number; created_at: string };

/** Today's date in the student's timezone (India by default), as YYYY-MM-DD. */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata" }).format(new Date());
}

/**
 * Re-plans a subject from today until the exam.
 * Completed tasks are kept; everything not done (including missed days) is rescheduled.
 */
export async function replanSubject(supabase: SupabaseClient, subjectId: string) {
  const [{ data: subject }, { data: topics }, { data: items }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", subjectId).single<Subject>(),
    supabase.from("topics").select("*").eq("subject_id", subjectId).returns<Topic[]>(),
    supabase.from("plan_items").select("*").eq("subject_id", subjectId).returns<PlanItem[]>(),
  ]);
  if (!subject || !topics) return;

  const today = todayISO();
  const learned = new Set((items ?? []).filter((i) => i.done && i.task_type === "learn").map((i) => i.topic_id));
  const minutesDoneToday = (items ?? [])
    .filter((i) => i.done && i.day === today)
    .reduce((sum, i) => sum + i.minutes, 0);

  const plan = buildPlan({
    topics: topics.map((t) => ({ ...t, learned: learned.has(t.id) })),
    today,
    examDate: subject.exam_date,
    hoursPerDay: Number(subject.hours_per_day),
    minutesDoneToday,
  });

  await supabase.from("plan_items").delete().eq("subject_id", subjectId).eq("done", false);
  if (plan.length) {
    await supabase.from("plan_items").insert(plan.map((p) => ({ ...p, subject_id: subjectId })));
  }
}

/** Changes a topic's mastery by `delta` (kept between 0 and 100). */
export async function adjustMastery(
  supabase: SupabaseClient,
  topicId: string,
  update: (t: Topic) => Partial<Topic>,
) {
  const { data: topic } = await supabase.from("topics").select("*").eq("id", topicId).single<Topic>();
  if (!topic) return null;
  const changes = update(topic);
  if (changes.mastery !== undefined) changes.mastery = Math.max(0, Math.min(100, Math.round(changes.mastery)));
  await supabase.from("topics").update(changes).eq("id", topicId);
  return topic;
}

/** Reads a PDF and returns the text of each page. */
export async function pdfPages(file: File) {
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((t) => t.replace(/\s+/g, " ").trim());
}

/** Saves a PDF's pages so "Chat with notes" can search them. */
export async function saveDocument(
  supabase: SupabaseClient,
  subjectId: string,
  name: string,
  kind: "syllabus" | "notes",
  pages: string[],
) {
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({ subject_id: subjectId, name, kind, page_count: pages.length })
    .select("id")
    .single();
  if (error || !doc) throw new Error(error?.message ?? "Could not save document");

  const rows = pages
    .map((content, i) => ({ document_id: doc.id, subject_id: subjectId, page_number: i + 1, content }))
    .filter((r) => r.content.length > 0);
  for (let i = 0; i < rows.length; i += 200) {
    const { error: pageError } = await supabase.from("doc_pages").insert(rows.slice(i, i + 200));
    if (pageError) throw new Error(pageError.message);
  }
  return doc.id as string;
}
