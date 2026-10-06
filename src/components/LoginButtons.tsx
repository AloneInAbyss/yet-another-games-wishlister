import { SteamIcon } from "./Icons";

/** A plain link: the login flow starts with a full-page redirect to Steam. */
export function LoginButtons() {
  return (
    <a
      href="/api/auth/steam"
      className="flex w-full items-center justify-center gap-2 rounded-md bg-[#171d25] px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:brightness-110"
    >
      <SteamIcon width={18} height={18} />
      Entrar com a Steam
    </a>
  );
}
