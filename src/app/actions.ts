"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adjustMastery, replanSubject, type PlanItem } from "@/lib/data";
import { createClient, requireUser } from "@/lib/supabase/server";

// ───────────── Login ─────────────

export async function authenticate(_prev: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const mode = form.get("mode");
  const supabase = await createClient();

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (!data.session) return "Account created! Check your email to confirm it, then log in.";
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ───────────── Study plan ─────────────

export async function toggleTask(itemId: string) {
  const { supabase } = await requireUser();
  const { data: item } = await supabase.from("plan_items").select("*").eq("id", itemId).single<PlanItem>();
  if (!item) return;

  const done = !item.done;
  await supabase
    .from("plan_items")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", itemId);

  // Finishing a session raises mastery a little; un-ticking undoes it.
  if (item.topic_id) {
    const gain = item.task_type === "learn" ? 25 : 10;
    await adjustMastery(supabase, item.topic_id, (t) => ({ mastery: t.mastery + (done ? gain : -gain) }));
  }
  revalidatePath("/", "layout");
}

export async function replan(subjectId: string) {
  const { supabase } = await requireUser();
  await replanSubject(supabase, subjectId);
  revalidatePath("/", "layout");
}

export async function deleteSubject(subjectId: string) {
  const { supabase } = await requireUser();
  await supabase.from("subjects").delete().eq("id", subjectId);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ───────────── Quiz result ─────────────

export async function saveQuizResult(topicId: string, score: number, total: number) {
  const { supabase } = await requireUser();
  if (total <= 0) return;
  const percent = Math.round((score / total) * 100);

  await supabase.from("quiz_attempts").insert({ topic_id: topicId, score, total });
  // Mastery moves toward the quiz score (recent results count more).
  const topic = await adjustMastery(supabase, topicId, (t) => ({
    mastery: 0.4 * t.mastery + 0.6 * percent,
    last_quiz_score: percent,
  }));
  if (topic) await replanSubject(supabase, topic.subject_id);
  revalidatePath("/", "layout");
}
