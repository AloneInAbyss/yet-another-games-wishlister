"use client";

import { useActionState } from "react";
import { signIn, signUp } from "./actions";
import { initialAuthActionState } from "@/lib/auth/validation";

function SubmitButton({
  label,
  pendingLabel,
  pending,
  className,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  className: string;
}) {
  return (
    <button type="submit" aria-disabled={pending} disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function AuthForms({ initialMessage }: { initialMessage?: string }) {
  const [signInState, signInAction, signInPending] = useActionState(
    signIn,
    initialAuthActionState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    initialAuthActionState,
  );

  return (
    <>
      <form action={signInAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        {signInState.fieldErrors?.email?.length ? (
          <p className="text-sm text-red-600">{signInState.fieldErrors.email[0]}</p>
        ) : null}
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        {signInState.fieldErrors?.password?.length ? (
          <p className="text-sm text-red-600">{signInState.fieldErrors.password[0]}</p>
        ) : null}
        {signInState.formError ? <p className="text-sm text-red-600">{signInState.formError}</p> : null}
        <SubmitButton
          label="Sign in"
          pendingLabel="Signing in..."
          pending={signInPending}
          className="rounded-md bg-black px-4 py-2 text-white"
        />
      </form>
      <form action={signUpAction} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        {signUpState.fieldErrors?.email?.length ? (
          <p className="text-sm text-red-600">{signUpState.fieldErrors.email[0]}</p>
        ) : null}
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
        {signUpState.fieldErrors?.password?.length ? (
          <p className="text-sm text-red-600">{signUpState.fieldErrors.password[0]}</p>
        ) : null}
        {signUpState.formError ? <p className="text-sm text-red-600">{signUpState.formError}</p> : null}
        {signUpState.message ? <p className="text-sm text-zinc-600">{signUpState.message}</p> : null}
        <SubmitButton
          label="Create account"
          pendingLabel="Creating account..."
          pending={signUpPending}
          className="rounded-md border border-zinc-300 px-4 py-2"
        />
      </form>
      {initialMessage ? <p className="text-sm text-zinc-600">{initialMessage}</p> : null}
    </>
  );
}
