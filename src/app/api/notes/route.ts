import { NextResponse } from "next/server";
import { apiUser, fail, handleError } from "@/lib/api";
import { pdfPages, saveDocument } from "@/lib/data";

export const maxDuration = 60;

// Upload notes PDFs for a subject so they can be searched in "Chat with notes".
export async function POST(request: Request) {
  const { supabase, user } = await apiUser();
  if (!user) return fail("Please log in again.", 401);

  try {
    const form = await request.formData();
    const subjectId = String(form.get("subjectId") ?? "");
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return fail("Choose at least one PDF.");

    const { data: subject } = await supabase.from("subjects").select("id").eq("id", subjectId).single();
    if (!subject) return fail("Subject not found.", 404);

    let pages = 0;
    for (const file of files) {
      if (file.type !== "application/pdf") return fail(`${file.name} is not a PDF.`);
      const text = await pdfPages(file);
      if (!text.some((t) => t.length > 0)) {
        return fail(`${file.name} has no readable text (it may be a scanned image).`);
      }
      await saveDocument(supabase, subjectId, file.name, "notes", text);
      pages += text.length;
    }
    return NextResponse.json({ pages });
  } catch (error) {
    return handleError(error);
  }
}
