import { NextResponse } from "next/server";
import { apiUser, fail, handleError } from "@/lib/api";
import { makeQuiz } from "@/lib/features";

export const maxDuration = 60;

// Generates a fresh quiz + flashcards for one topic, using the student's notes when available.
export async function POST(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return fail("Please log in again.", 401);

  try {
    const { topicId } = (await request.json()) as { topicId?: string };
    const { data: topic } = await supabase
      .from("topics")
      .select("name, subject_id, subjects(name)")
      .eq("id", topicId)
      .single<{ name: string; subject_id: string; subjects: { name: string } }>();
    if (!topic) return fail("Topic not found.", 404);

    const query = topic.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .map((w) => `${w}:*`)
      .join(" | ");
    const { data: pages } = query
      ? await supabase.rpc("search_pages", { p_subject: topic.subject_id, p_query: query, p_limit: 4 })
      : { data: [] };
    const notes = ((pages ?? []) as { content: string }[]).map((p) => p.content).join("\n\n");

    const quiz = await makeQuiz(topic.subjects.name, topic.name, notes);
    quiz.questions = quiz.questions.filter((q) => q.options.length >= 2 && q.correct_index < q.options.length);
    return NextResponse.json(quiz);
  } catch (error) {
    return handleError(error);
  }
}
