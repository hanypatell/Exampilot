"use client";

import { useTransition } from "react";
import Link from "next/link";
import { BookOpen, Check, ClipboardCheck, Dumbbell, RotateCcw } from "lucide-react";
import { toggleTask } from "@/app/actions";

const TYPES = {
  learn: { label: "Learn", icon: BookOpen },
  practice: { label: "Practice", icon: Dumbbell },
  revise: { label: "Revise", icon: RotateCcw },
  mock: { label: "Mock test", icon: ClipboardCheck },
} as const;

export type TaskView = {
  id: string;
  task_type: keyof typeof TYPES;
  minutes: number;
  done: boolean;
  topic_id: string | null;
  topicName: string | null;
  subjectName?: string;
};

// One study session in the plan, with a tick box.
export function TaskRow({ task }: { task: TaskView }) {
  const [pending, start] = useTransition();
  const type = TYPES[task.task_type];

  return (
    <li className={`flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 ${task.done ? "bg-slate-50" : "bg-white"} ${pending ? "opacity-60" : ""}`}>
      <button
        onClick={() => start(() => toggleTask(task.id))}
        disabled={pending}
        aria-label={task.done ? "Mark as not done" : "Mark as done"}
        className={`grid size-6 shrink-0 place-items-center rounded-md border-2 transition ${task.done ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 hover:border-indigo-500"}`}
      >
        {task.done && <Check className="size-4" />}
      </button>
      <type.icon className="size-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${task.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {type.label}: {task.topicName ?? "Full syllabus"}
        </p>
        <p className="text-xs text-slate-500">
          {task.subjectName ? `${task.subjectName} · ` : ""}
          {task.minutes} min
        </p>
      </div>
      {task.topic_id && (task.task_type === "practice" || task.task_type === "revise") && !task.done && (
        <Link href={`/practice/${task.topic_id}`} className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline">
          Quiz me
        </Link>
      )}
    </li>
  );
}
