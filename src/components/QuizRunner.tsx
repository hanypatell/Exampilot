"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { saveQuizResult } from "@/app/actions";
import type { Quiz } from "@/lib/features";

export function QuizRunner({ topicId }: { topicId: string }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<"quiz" | "cards">("quiz");
  const [saving, startSaving] = useTransition();

  async function generate() {
    setLoading(true);
    setError("");
    setAnswers({});
    setSubmitted(false);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuiz(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quiz.");
    } finally {
      setLoading(false);
    }
  }

  if (!quiz) {
    return (
      <div className="card mt-6 py-12 text-center">
        <p className="text-slate-600">Get 5 exam-style questions and 6 flashcards on this topic.</p>
        <button onClick={generate} disabled={loading} className="btn mt-5">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {loading ? "Writing your quiz…" : "Generate quiz"}
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const score = quiz.questions.filter((q, i) => answers[i] === q.correct_index).length;
  const allAnswered = quiz.questions.every((_, i) => answers[i] !== undefined);

  return (
    <div className="mt-6">
      <div className="mb-4 flex gap-2">
        {(["quiz", "cards"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {t === "quiz" ? `Quiz (${quiz.questions.length})` : `Flashcards (${quiz.flashcards.length})`}
          </button>
        ))}
        <button onClick={generate} disabled={loading} className="ml-auto flex items-center gap-1 text-sm font-semibold text-indigo-600">
          <RotateCcw className={`size-4 ${loading ? "animate-spin" : ""}`} /> New set
        </button>
      </div>

      {tab === "quiz" ? (
        <div className="space-y-4">
          {quiz.questions.map((q, i) => (
            <div key={i} className="card">
              <p className="font-medium whitespace-pre-wrap">
                {i + 1}. {q.question}
              </p>
              <div className="mt-3 grid gap-2">
                {q.options.map((opt, j) => {
                  const picked = answers[i] === j;
                  const correct = submitted && j === q.correct_index;
                  const wrong = submitted && picked && j !== q.correct_index;
                  return (
                    <button
                      key={j}
                      disabled={submitted}
                      onClick={() => setAnswers({ ...answers, [i]: j })}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        correct
                          ? "border-green-500 bg-green-50 text-green-900"
                          : wrong
                            ? "border-red-400 bg-red-50 text-red-900"
                            : picked
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="font-semibold text-slate-400">{String.fromCharCode(65 + j)}</span>
                      <span className="flex-1">{opt}</span>
                      {correct && <Check className="size-4 text-green-600" />}
                      {wrong && <X className="size-4 text-red-600" />}
                    </button>
                  );
                })}
              </div>
              {submitted && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{q.explanation}</p>}
            </div>
          ))}

          {submitted ? (
            <div className="card flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-bold">
                You scored {score}/{quiz.questions.length} {score / quiz.questions.length >= 0.8 ? "🎉" : score / quiz.questions.length >= 0.5 ? "👍" : "— keep practising 💪"}
              </p>
              <p className="text-sm text-slate-500">{saving ? "Updating your mastery & plan…" : "Mastery and plan updated ✓"}</p>
            </div>
          ) : (
            <button
              className="btn w-full py-3"
              disabled={!allAnswered}
              onClick={() => {
                setSubmitted(true);
                startSaving(() => saveQuizResult(topicId, score, quiz.questions.length));
              }}
            >
              {allAnswered ? "Submit answers" : "Answer all questions to submit"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quiz.flashcards.map((c, i) => (
            <Flashcard key={i} front={c.front} back={c.back} />
          ))}
        </div>
      )}
    </div>
  );
}

function Flashcard({ front, back }: { front: string; back: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped(!flipped)}
      className={`card flex min-h-36 flex-col items-center justify-center text-center transition ${flipped ? "border-indigo-200 bg-indigo-50" : "hover:border-indigo-300"}`}
    >
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{flipped ? "Answer" : "Tap to flip"}</p>
      <p className="mt-2 text-sm font-medium whitespace-pre-wrap text-slate-900">{flipped ? back : front}</p>
    </button>
  );
}
