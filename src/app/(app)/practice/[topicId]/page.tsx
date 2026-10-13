import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuizRunner } from "@/components/QuizRunner";
import { Importance, Meter } from "@/components/ui";
import type { Topic } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

export default async function PracticePage({ params }: PageProps<"/practice/[topicId]">) {
  const { topicId } = await params;
  const { supabase } = await requireUser();
  const { data: topic } = await supabase
    .from("topics")
    .select("*, subjects(name)")
    .eq("id", topicId)
    .maybeSingle<Topic & { subjects: { name: string } }>();
  if (!topic) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/subjects/${topic.subject_id}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> {topic.subjects.name}
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{topic.name}</h1>
          <p className="flex items-center gap-2 text-sm text-slate-600">
            {topic.unit} · <Importance value={topic.importance} />
          </p>
        </div>
        <div className="w-48">
          <p className="text-xs text-slate-500">Your mastery</p>
          <Meter value={topic.mastery} />
        </div>
      </div>
      <QuizRunner topicId={topic.id} />
    </div>
  );
}
