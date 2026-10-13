"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { deleteSubject, replan } from "@/app/actions";

export function ReplanButton({ subjectId, highlight }: { subjectId: string; highlight?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button onClick={() => start(() => replan(subjectId))} disabled={pending} className={highlight ? "btn" : "btn-ghost"}>
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} /> {pending ? "Re-planning…" : "Re-plan"}
    </button>
  );
}

export function DeleteSubjectButton({ subjectId, name }: { subjectId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => confirm(`Delete "${name}" and its plan, topics and notes?`) && start(() => deleteSubject(subjectId))}
      disabled={pending}
      className="btn-ghost px-3 text-red-600 hover:bg-red-50"
      title="Delete subject"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function NotesUpload({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.append("subjectId", subjectId);
    Array.from(files).forEach((f) => form.append("files", f));
    try {
      const res = await fetch("/api/notes", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Added ${data.pages} pages ✓`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className={`btn-ghost w-full cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        {busy ? "Reading PDF…" : "Upload notes (PDF)"}
        <input type="file" accept="application/pdf" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
      </label>
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </div>
  );
}
