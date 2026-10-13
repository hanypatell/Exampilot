import Link from "next/link";
import { Plane } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
      <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
        <Plane className="size-4 -rotate-45" />
      </span>
      ExamPilot
    </Link>
  );
}
