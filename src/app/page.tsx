import Link from "next/link";
import { ArrowRight, Brain, Camera, CalendarDays, Gauge, MessageSquareText, RefreshCw } from "lucide-react";
import { Logo } from "@/components/Logo";

const features = [
  {
    icon: CalendarDays,
    title: "Syllabus → Study plan",
    text: "Upload your syllabus (and past papers). AI finds every topic, ranks it by exam importance and builds a day-by-day plan.",
  },
  {
    icon: Camera,
    title: "DoubtSnap",
    text: "Stuck on a question? Snap a photo and get a step-by-step solution plus 3 similar questions to practise.",
  },
  {
    icon: MessageSquareText,
    title: "Chat with your notes",
    text: "Ask anything about your own PDFs. Every answer tells you the exact page it came from.",
  },
  {
    icon: Brain,
    title: "Quizzes & flashcards",
    text: "One click creates exam-style MCQs and flashcards for any topic. Your scores update your mastery.",
  },
  {
    icon: RefreshCw,
    title: "Plan that adapts",
    text: "Missed a day? Asked doubts on a topic? Scored low in a quiz? Your plan re-arranges itself automatically.",
  },
  {
    icon: Gauge,
    title: "Readiness score",
    text: "See how exam-ready you are for each subject, your weak topics and your study streak — at a glance.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/login" className="btn-ghost">
          Log in
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-20">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            AI study co-pilot for students
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Plan smarter. Get unstuck faster.
            <span className="block text-indigo-600">Walk into exams ready.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            ExamPilot turns your syllabus into a personal study plan, solves your doubts from a photo, and keeps
            re-planning around your weak topics until exam day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn px-6 py-3 text-base">
              Get started free <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card">
                <f.icon className="size-6 text-indigo-600" />
                <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
          <div className="card bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white">
            <h2 className="text-2xl font-bold">The smart loop</h2>
            <ol className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
              {[
                "You snap a doubt or take a quiz",
                "AI detects the topic you're weak in",
                "Mastery score for that topic drops",
                "Your plan gives it more time",
              ].map((step, i) => (
                <li key={step} className="rounded-xl bg-white/10 p-4">
                  <span className="text-2xl font-bold text-white/70">{i + 1}</span>
                  <p className="mt-1">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Built with Next.js, Supabase and AI · ExamPilot
      </footer>
    </div>
  );
}
