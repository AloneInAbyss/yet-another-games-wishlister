"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { initialAuthActionState } from "@/lib/auth/validation";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
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

  useEffect(() => {
    if (signUpState.message) {
      toast.warning(signUpState.message);
    }
  }, [signUpState.message]);

  useEffect(() => {
    if (initialMessage) {
      toast.warning(initialMessage);
    }
  }, [initialMessage]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your wishlist dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="flex flex-col gap-3">
            <Input name="email" type="email" required placeholder="Email" />
            {signInState.fieldErrors?.email?.length ? (
              <p className="text-sm text-red-600">{signInState.fieldErrors.email[0]}</p>
            ) : null}
            <Input name="password" type="password" required placeholder="Password" />
            {signInState.fieldErrors?.password?.length ? (
              <p className="text-sm text-red-600">{signInState.fieldErrors.password[0]}</p>
            ) : null}
            {signInState.formError ? (
              <p className="text-sm text-red-600">{signInState.formError}</p>
            ) : null}
            <SubmitButton
              label="Sign in"
              pendingLabel="Signing in..."
              pending={signInPending}
              variant="default"
            />
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>New here? Create your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUpAction} className="flex flex-col gap-3">
            <Input name="email" type="email" required placeholder="Email" />
            {signUpState.fieldErrors?.email?.length ? (
              <p className="text-sm text-red-600">{signUpState.fieldErrors.email[0]}</p>
            ) : null}
            <Input name="password" type="password" required placeholder="Password" />
            {signUpState.fieldErrors?.password?.length ? (
              <p className="text-sm text-red-600">{signUpState.fieldErrors.password[0]}</p>
            ) : null}
            {signUpState.formError ? (
              <p className="text-sm text-red-600">{signUpState.formError}</p>
            ) : null}
            <SubmitButton
              label="Create account"
              pendingLabel="Creating account..."
              pending={signUpPending}
              variant="outline"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
