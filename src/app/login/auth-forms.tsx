"use client";

import { Button } from "@/components/ui/button";
import { initialAuthActionState } from "@/lib/auth/validation";
import { useActionState } from "react";
import { signIn, signUp } from "./actions";

function SubmitButton({
  label,
  pendingLabel,
  pending,
  variant,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
  variant: "default" | "outline";
}) {
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending} variant={variant}>
      {pending ? pendingLabel : label}
    </Button>
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
          variant="default"
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
          variant="outline"
        />
      </form>
      {initialMessage ? <p className="text-sm text-zinc-600">{initialMessage}</p> : null}
    </>
  );
}
