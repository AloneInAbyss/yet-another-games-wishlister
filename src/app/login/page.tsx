import { AuthForms } from "./auth-forms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Login</h1>
      <AuthForms initialMessage={params.message} />
    </main>
  );
}
