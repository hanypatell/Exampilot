import { AlertTriangle, Star } from "lucide-react";

// Small display pieces used on several pages.

/** Horizontal meter for a 0-100 value (mastery / readiness). One hue; the number is always shown. */
export function Meter({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-2" title={`${label ?? "Mastery"}: ${value}%`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.max(2, value)}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-600">{value}%</span>
    </div>
  );
}

export function Importance({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" title={`Exam importance ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-3 ${i <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </span>
  );
}

export function WeakBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      <AlertTriangle className="size-3" /> Weak
    </span>
  );
}

/** Big number tile for the dashboard. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function formatDay(iso: string, today: string) {
  const diff = Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
