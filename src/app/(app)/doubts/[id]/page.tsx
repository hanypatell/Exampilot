import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Lightbulb } from "lucide-react";
import { SimilarQuestion } from "@/components/SimilarQuestion";
import type { Solution } from "@/lib/features";
import { requireUser } from "@/lib/supabase/server";

export default async function DoubtView({ params }: PageProps<"/doubts/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: doubt } = await supabase
    .from("doubts")
    .select("*, topics(id, name), subjects(id, name)")
    .eq("id", id)
    .maybeSingle<{
      question_text: string;
      solution: Solution;
      thumbnail: string | null;
      topics: { id: string; name: string } | null;
      subjects: { id: string; name: string } | null;
    }>();
  if (!doubt) notFound();
  const s = doubt.solution;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={doubt.subjects ? `/subjects/${doubt.subjects.id}` : "/dashboard"} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> {doubt.subjects?.name ?? "Dashboard"}
      </Link>

      <div className="card flex gap-4">
        {doubt.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={doubt.thumbnail} alt="Question photo" className="hidden h-28 w-28 shrink-0 rounded-lg object-cover sm:block" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Question</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-900">{doubt.question_text}</p>
          {doubt.topics && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
              <AlertTriangle className="size-3.5" /> Topic: <b>{doubt.topics.name}</b> — marked for extra practice in your plan
            </p>
          )}
        </div>
      </div>

      <div className="card border-indigo-100 bg-indigo-50/50">
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <Lightbulb className="size-4" /> Key concept
        </p>
        <p className="mt-1 text-sm whitespace-pre-wrap text-indigo-950">{s.key_concept}</p>
      </div>

      <div className="card">
        <h2 className="font-semibold">Step-by-step solution</h2>
        <ol className="mt-4 space-y-4">
          {s.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{step.explanation}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex gap-2 rounded-xl bg-green-50 p-4 text-green-900">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Final answer</p>
            <p className="text-sm whitespace-pre-wrap">{s.final_answer}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          <b>Common mistake:</b> {s.common_mistake}
        </p>
      </div>

      <div className="card">
        <h2 className="font-semibold">Practise 3 similar questions</h2>
        <div className="mt-4 space-y-3">
          {s.similar_questions.map((q, i) => (
            <SimilarQuestion key={i} index={i + 1} {...q} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={`/doubt${doubt.subjects ? `?subject=${doubt.subjects.id}` : ""}`} className="btn">
          <Camera className="size-4" /> Snap another doubt
        </Link>
        {doubt.topics && (
          <Link href={`/practice/${doubt.topics.id}`} className="btn-ghost">
            Quiz me on {doubt.topics.name}
          </Link>
        )}
      </div>
    </div>
  );
}
