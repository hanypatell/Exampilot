import { Suspense } from "react";
import Link from "next/link";
import { Camera, LayoutDashboard, LogOut, Plus } from "lucide-react";
import { logout } from "@/app/actions";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/supabase/server";

// Shell for every logged-in page: top navigation + page content.
// Parts that need the logged-in user load inside <Suspense>, so the shell appears instantly.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <Logo href="/dashboard" />
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link href="/dashboard" className="btn-ghost border-0 px-3" title="Dashboard">
              <LayoutDashboard className="size-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link href="/doubt" className="btn px-3" title="Snap a doubt">
              <Camera className="size-4" /> <span className="hidden sm:inline">Snap a doubt</span>
            </Link>
            <form action={logout}>
              <button className="btn-ghost border-0 px-3" title="Log out">
                <LogOut className="size-4" />
              </button>
            </form>
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          <Suspense fallback={<div className="h-7" />}>
            <SubjectLinks />
          </Suspense>
          <Link
            href="/subjects/new"
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-indigo-300 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <Plus className="size-3.5" /> Add subject
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}

async function SubjectLinks() {
  const { supabase } = await requireUser();
  const { data: subjects } = await supabase.from("subjects").select("id, name").order("exam_date");
  return subjects?.map((s) => (
    <Link
      key={s.id}
      href={`/subjects/${s.id}`}
      className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
    >
      {s.name}
    </Link>
  ));
}

function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-slate-200" />
    </div>
  );
}
