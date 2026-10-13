"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, SendHorizontal } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: { document: string; page: number }[];
  error?: boolean;
};

const SUGGESTIONS = ["Summarise the most important topics", "Explain this unit like I'm a beginner", "What are likely exam questions?"];

export function ChatBox({ subjectId }: { subjectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    const history = messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, question, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: err instanceof Error ? err.message : "Failed.", error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6 flex h-[65vh] flex-col p-0">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-slate-500">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm hover:border-indigo-300 hover:text-indigo-700">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "bg-indigo-600 text-white" : m.error ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
              {!!m.sources?.length && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.sources.map((s, j) => (
                    <span key={j} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-indigo-700">
                      <FileText className="size-3" /> {s.document} · p.{s.page}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Searching your notes…
          </div>
        )}
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t border-slate-200 p-3"
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} className="input" placeholder="Ask anything about your notes…" />
        <button className="btn px-3" disabled={busy || !input.trim()} aria-label="Send">
          <SendHorizontal className="size-4" />
        </button>
      </form>
    </div>
  );
}
