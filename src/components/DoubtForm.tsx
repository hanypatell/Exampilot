"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Sparkles, X } from "lucide-react";

// Shrinks the photo in the browser before upload (faster + fits server limits).
async function resize(file: File, maxSide: number, quality: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function DoubtForm({ subjects, defaultSubject }: { subjects: { id: string; name: string }[]; defaultSubject: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function choose(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError("Add a photo first.");
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const [image, thumbnail] = await Promise.all([resize(file, 1600, 0.85), resize(file, 360, 0.6)]);
      const res = await fetch("/api/doubt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, thumbnail, subjectId: form.get("subjectId") || undefined, note: form.get("note") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/doubts/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mt-6 space-y-5">
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your question" className="max-h-96 w-full rounded-xl bg-slate-100 object-contain" />
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPreview("");
            }}
            className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 shadow"
            aria-label="Remove photo"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 px-4 py-14 text-center hover:border-indigo-400 hover:bg-indigo-50/40">
          <span className="grid size-14 place-items-center rounded-full bg-indigo-50">
            <Camera className="size-7 text-indigo-600" />
          </span>
          <span className="font-medium text-slate-800">Take a photo or upload an image</span>
          <span className="text-xs text-slate-500">On your phone this opens the camera</span>
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="subjectId">Subject</label>
          <select id="subjectId" name="subjectId" defaultValue={defaultSubject} className="input">
            <option value="">Not sure / other</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="note">Where are you stuck? (optional)</label>
          <input id="note" name="note" className="input" placeholder="e.g. I don't get step 2" />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button className="btn w-full py-3" disabled={busy || !file}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Solving step by step…
          </>
        ) : (
          <>
            <Sparkles className="size-4" /> Solve my doubt
          </>
        )}
      </button>
    </form>
  );
}
