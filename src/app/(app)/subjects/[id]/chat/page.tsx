import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChatBox } from "@/components/ChatBox";
import { requireUser } from "@/lib/supabase/server";

export default async function ChatPage({ params }: PageProps<"/subjects/[id]/chat">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const [{ data: subject }, { count }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("subject_id", id),
  ]);
  if (!subject) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/subjects/${id}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> {subject.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Chat with your notes</h1>
      <p className="text-slate-600">Answers come from your uploaded PDFs, with page numbers.</p>
      {!count && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You haven&apos;t uploaded any notes for this subject yet, so answers will come from general knowledge.{" "}
          <Link href={`/subjects/${id}`} className="font-semibold underline">Upload notes</Link>
        </p>
      )}
      <ChatBox subjectId={id} />
    </div>
  );
}
