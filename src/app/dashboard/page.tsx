import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-zinc-700">Signed in as {user.email}</p>
      <form action={signOut}>
        <button className="rounded-md border border-zinc-300 px-4 py-2" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
