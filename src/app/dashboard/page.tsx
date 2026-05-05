import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";

export default async function DashboardPage() {
  const { user } = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-zinc-700">Signed in as {user.email}</p>
      <form action={signOut}>
        <Button variant="outline" type="submit">
          Sign out
        </Button>
      </form>
    </main>
  );
}
