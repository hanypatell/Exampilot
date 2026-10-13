import { NextResponse } from "next/server";
import { apiUser, fail, handleError } from "@/lib/api";
import { pdfPages, replanSubject, saveDocument, todayISO } from "@/lib/data";
import { extractTopics } from "@/lib/features";

export const maxDuration = 120;

// Create a subject: read the syllabus (PDFs and/or pasted text), let AI find the
// topics, save everything and build the first study plan.
export async function POST(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return fail("Please log in again.", 401);

  try {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const examDate = String(form.get("examDate") ?? "");
    const hoursPerDay = Math.min(12, Math.max(0.5, Number(form.get("hoursPerDay") ?? 2)));
    const pastedText = String(form.get("syllabusText") ?? "").trim();
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);

    if (!name) return fail("Give the subject a name.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || examDate <= todayISO()) return fail("Pick an exam date in the future.");
    if (!pastedText && files.length === 0) return fail("Upload a syllabus PDF or paste the syllabus text.");

    const pdfs: { name: string; pages: string[] }[] = [];
    for (const file of files) {
      if (file.type !== "application/pdf") return fail(`${file.name} is not a PDF.`);
      pdfs.push({ name: file.name, pages: await pdfPages(file) });
    }

    const material = [
      pastedText,
      ...pdfs.map((p) => `=== ${p.name} ===\n${p.pages.join("\n")}`),
    ].join("\n\n");
    if (material.replace(/\s/g, "").length < 40) {
      return fail("Couldn't read any text. If your PDF is a scanned image, paste the syllabus text instead.");
    }

    const { units } = await extractTopics(name, material);
    const topicRows = units.flatMap((u) => u.topics.map((t) => ({ unit: u.unit, ...t })));
    if (topicRows.length === 0) return fail("No topics were found in that syllabus.");

    const { data: subject, error } = await supabase
      .from("subjects")
      .insert({ name, exam_date: examDate, hours_per_day: hoursPerDay })
      .select("id")
      .single();
    if (error || !subject) throw new Error(error?.message);

    await supabase.from("topics").insert(
      topicRows.map((t, i) => ({
        subject_id: subject.id,
        unit: t.unit,
        name: t.name,
        position: i,
        importance: Math.min(5, Math.max(1, Math.round(t.importance))),
      })),
    );
    for (const pdf of pdfs) await saveDocument(supabase, subject.id, pdf.name, "syllabus", pdf.pages);
    await replanSubject(supabase, subject.id);

    return NextResponse.json({ id: subject.id });
  } catch (error) {
    return handleError(error);
  }
}
