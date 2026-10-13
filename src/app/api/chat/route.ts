import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiUser, fail, handleError } from "@/lib/api";
import { answerFromNotes, type ChatTurn, type PageExcerpt } from "@/lib/features";

export const maxDuration = 60;

const STOPWORDS = new Set(
  "the and for are but not you all any can had her was one our out has him his how its may new now old see two way who did get let put say she too use what when where which why with this that from they will would there their about explain describe define give example examples difference between tell does".split(
    " ",
  ),
);

// Turns a question into a search like "deadlock:* | prevention:*".
function toSearchQuery(question: string) {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return [...new Set(words)].slice(0, 12).map((w) => `${w}:*`).join(" | ");
}

// Retrieval step: pick the note pages most relevant to the question.
// Small subjects send every page; bigger ones use Postgres full-text search.
async function findPages(supabase: SupabaseClient, subjectId: string, question: string): Promise<PageExcerpt[]> {
  const { data: docs } = await supabase.from("documents").select("id, name, page_count").eq("subject_id", subjectId);
  if (!docs?.length) return [];
  const docName = new Map(docs.map((d) => [d.id, d.name as string]));
  const totalPages = docs.reduce((s, d) => s + d.page_count, 0);

  let rows: { document_id: string; page_number: number; content: string }[] = [];
  if (totalPages <= 40) {
    const { data } = await supabase
      .from("doc_pages")
      .select("document_id, page_number, content")
      .eq("subject_id", subjectId)
      .order("page_number");
    rows = data ?? [];
  } else {
    const query = toSearchQuery(question);
    if (query) {
      const { data } = await supabase.rpc("search_pages", { p_subject: subjectId, p_query: query, p_limit: 10 });
      rows = data ?? [];
    }
  }
  return rows.map((r) => ({ document: docName.get(r.document_id) ?? "notes", page: r.page_number, content: r.content }));
}

export async function POST(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return fail("Please log in again.", 401);

  try {
    const body = (await request.json()) as { subjectId?: string; question?: string; history?: ChatTurn[] };
    const question = body.question?.trim();
    if (!question) return fail("Type a question.");

    const { data: subject } = await supabase.from("subjects").select("id, name").eq("id", body.subjectId).single();
    if (!subject) return fail("Subject not found.", 404);

    // Use the earlier question too, so follow-ups like "give an example" still find the right pages.
    const lastQuestion = [...(body.history ?? [])].reverse().find((t) => t.role === "user")?.content ?? "";
    const pages = await findPages(supabase, subject.id, `${question} ${lastQuestion}`);
    const answer = await answerFromNotes(subject.name, question, body.history ?? [], pages);
    return NextResponse.json(answer);
  } catch (error) {
    return handleError(error);
  }
}
