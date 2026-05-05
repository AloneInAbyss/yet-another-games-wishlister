"use server";

import { authSchema, type AuthActionState } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function parseAuthForm(formData: FormData) {
  return authSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseAuthForm(formData);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { email, password } = parsed.data;
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      formError: "Invalid email or password.",
    };
  }

  redirect("/dashboard");
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseAuthForm(formData);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { email, password } = parsed.data;
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return {
      formError: "Could not create account.",
    };
  }

  return {
    message: "Check your email to confirm your account.",
  };
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
