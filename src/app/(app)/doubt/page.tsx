import { DoubtForm } from "@/components/DoubtForm";
import { requireUser } from "@/lib/supabase/server";

export default async function DoubtPage({ searchParams }: PageProps<"/doubt">) {
  const { subject } = await searchParams;
  const { supabase } = await requireUser();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("exam_date");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">📸 DoubtSnap</h1>
      <p className="mt-1 text-slate-600">
        Take a photo of any question — handwritten or printed — and get a step-by-step solution.
      </p>
      <DoubtForm subjects={subjects ?? []} defaultSubject={typeof subject === "string" ? subject : ""} />
    </div>
  );
}
