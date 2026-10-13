"use client";

import { useState } from "react";

export function SimilarQuestion({ index, question, hint, answer }: { index: number; question: string; hint: string; answer: string }) {
  const [shown, setShown] = useState<"none" | "hint" | "answer">("none");
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm whitespace-pre-wrap text-slate-900">
        <b>Q{index}.</b> {question}
      </p>
      <div className="mt-3 flex gap-3 text-xs font-semibold">
        <button onClick={() => setShown(shown === "hint" ? "none" : "hint")} className="text-amber-700 hover:underline">
          {shown === "hint" ? "Hide hint" : "Show hint"}
        </button>
        <button onClick={() => setShown(shown === "answer" ? "none" : "answer")} className="text-indigo-600 hover:underline">
          {shown === "answer" ? "Hide answer" : "Show answer"}
        </button>
      </div>
      {shown !== "none" && (
        <p className={`mt-2 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${shown === "hint" ? "bg-amber-50 text-amber-900" : "bg-indigo-50 text-indigo-900"}`}>
          {shown === "hint" ? hint : answer}
        </p>
      )}
    </div>
  );
}
