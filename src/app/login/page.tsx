"use client";

import { useActionState, useState } from "react";
import { authenticate } from "@/app/actions";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, formAction, pending] = useActionState(authenticate, null);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-6">
          <h1 className="text-xl font-bold text-slate-900">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "login" ? "Log in to continue studying." : "It takes 10 seconds."}
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="mode" value={mode} />
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required className="input" placeholder="you@college.edu" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required minLength={6} className="input" placeholder="At least 6 characters" />
            </div>
            {message && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p>}
            <button className="btn w-full" disabled={pending}>
              {pending ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="font-semibold text-indigo-600 hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
