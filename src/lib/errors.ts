/** An error whose message is safe and meant to be shown to the user. */
export class UserError extends Error {}

export class RateLimitError extends UserError {
  constructor(public retryAfterSeconds: number) {
    super(`Muitas tentativas. Tente de novo em ${formatWait(retryAfterSeconds)}.`);
  }
}

export class SteamUnavailableError extends UserError {
  constructor() {
    super("A Steam está limitando as consultas no momento. Tente de novo em alguns minutos.");
  }
}

export class AuthError extends UserError {
  constructor() {
    super("Você precisa entrar para fazer isso.");
  }
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, seconds)} s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${Math.ceil(seconds / 3600)} h`;
}
