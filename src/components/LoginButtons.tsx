import { isGoogleConfigured } from "@/lib/oauth";
import { SteamIcon } from "./Icons";

const base =
  "flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition hover:brightness-110";

/** Plain links: login flows start with a full-page redirect to Steam/Google. */
export function LoginButtons() {
  return (
    <div className="flex w-full flex-col gap-2">
      <a href="/api/auth/steam" className={`${base} bg-[#171d25] text-white ring-1 ring-white/15`}>
        <SteamIcon width={18} height={18} />
        Entrar com a Steam
      </a>
      {isGoogleConfigured() && (
        <a href="/api/auth/google" className={`${base} bg-white text-zinc-900`}>
          Entrar com o Google
        </a>
      )}
    </div>
  );
}
