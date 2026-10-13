import { NextResponse } from "next/server";
import { apiUser, fail, handleError } from "@/lib/api";
import { adjustMastery, replanSubject, type Topic } from "@/lib/data";
import { solveDoubt } from "@/lib/features";

export const maxDuration = 120;

// DoubtSnap: photo of a question → step-by-step solution.
// The question is matched to a syllabus topic; that topic is marked weaker
// and the study plan is updated to give it more time.
export async function POST(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return fail("Please log in again.", 401);

  try {
    const body = (await request.json()) as { image?: string; thumbnail?: string; subjectId?: string; note?: string };
    const match = body.image?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) return fail("Please add a photo of the question.");
    const mimeType = match[1] as "image/jpeg" | "image/png" | "image/webp";

    let topics: Topic[] = [];
    let subjectId: string | null = null;
    if (body.subjectId) {
      const { data } = await supabase.from("topics").select("*").eq("subject_id", body.subjectId).returns<Topic[]>();
      topics = data ?? [];
      subjectId = body.subjectId;
    }

    const solution = await solveDoubt({ mimeType, base64: match[2] }, topics.map((t) => t.name), body.note?.slice(0, 500) ?? "");
    if (!solution.readable) {
      return fail("I couldn't read a question in that photo. Try a clearer, well-lit picture.");
    }

    const topic = topics.find((t) => t.name.toLowerCase() === solution.topic.toLowerCase()) ?? null;
    const { data: doubt, error } = await supabase
      .from("doubts")
      .insert({
        subject_id: subjectId,
        topic_id: topic?.id ?? null,
        question_text: solution.question_text,
        solution,
        thumbnail: body.thumbnail?.startsWith("data:image/") ? body.thumbnail : null,
      })
      .select("id")
      .single();
    if (error || !doubt) throw new Error(error?.message);

    if (topic && subjectId) {
      await adjustMastery(supabase, topic.id, (t) => ({ weak_count: t.weak_count + 1, mastery: t.mastery - 10 }));
      await replanSubject(supabase, subjectId);
    }
    return NextResponse.json({ id: doubt.id });
  } catch (error) {
    return handleError(error);
  }
}
