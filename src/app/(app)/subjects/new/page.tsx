"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Sparkles } from "lucide-react";

const STEPS = ["Reading your syllabus…", "Finding topics & exam importance…", "Building your day-by-day plan…"];

export default function NewSubjectPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState(-1);
  const [minDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    form.delete("files");
    files.forEach((f) => form.append("files", f));

    // Cosmetic progress messages while the AI works.
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    try {
      const res = await fetch("/api/subjects", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/subjects/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep(-1);
    } finally {
      clearInterval(timer);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Add a subject</h1>
      <p className="mt-1 text-slate-600">Upload the syllabus (and past papers if you have them). AI does the planning.</p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label" htmlFor="name">Subject name</label>
            <input id="name" name="name" required className="input" placeholder="e.g. Operating Systems" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="examDate">Exam date</label>
            <input id="examDate" name="examDate" type="date" required min={minDate} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="hoursPerDay">Hours / day</label>
            <input id="hoursPerDay" name="hoursPerDay" type="number" min={0.5} max={12} step={0.5} defaultValue={2} className="input" />
          </div>
        </div>

        <div>
          <span className="label">Syllabus &amp; past papers (PDF)</span>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-indigo-400 hover:bg-indigo-50/40">
            <FileUp className="size-7 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700">
              {files.length ? files.map((f) => f.name).join(", ") : "Click to choose PDFs"}
            </span>
            <span className="text-xs text-slate-500">Past papers help the AI rank topics by how often they&apos;re asked</span>
            <input
              type="file"
              name="files"
              accept="application/pdf"
              multiple
              className="sr-only"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
        </div>

        <div>
          <label className="label" htmlFor="syllabusText">…or paste the syllabus text</label>
          <textarea
            id="syllabusText"
            name="syllabusText"
            rows={5}
            className="input"
            placeholder={"Unit 1: Introduction to OS, system calls, OS structure\nUnit 2: Processes, threads, CPU scheduling…"}
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button className="btn w-full py-3" disabled={step >= 0}>
          {step >= 0 ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {STEPS[step]}
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate my study plan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
