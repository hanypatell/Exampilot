import "server-only";
import { NextResponse } from "next/server";
import { AIError } from "./ai";
import { createClient } from "./supabase/server";

// Small helpers so every API route handles login and errors the same way.

export async function apiUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof AIError) return fail(error.message, 502);
  console.error(error);
  return fail("Something went wrong. Please try again.", 500);
}
