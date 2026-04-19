import type { NextRequest } from "next/server";

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function hostnameLooksLocal(hostname: string): boolean {
  const h = hostname.replace(/:\d+$/, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * Public base URL for this deployment (OAuth `redirectTo`, post-auth redirects).
 *
 * Prefer `APP_ORIGIN` or `NEXT_PUBLIC_SITE_URL` on Vercel when the request URL
 * still shows `localhost` (misconfigured `Host` / proxy). Otherwise trust
 * `x-forwarded-host` from the edge, then `request.nextUrl.origin`, then
 * `VERCEL_URL` when on Vercel with a local-looking origin.
 */
export function resolvePublicAppOrigin(
  request: Pick<NextRequest, "nextUrl" | "headers">,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = stripTrailingSlash(env.APP_ORIGIN || env.NEXT_PUBLIC_SITE_URL || "");
  if (explicit) return explicit;

  const forwardedRaw = request.headers.get("x-forwarded-host");
  const forwardedHost = forwardedRaw?.split(",")[0]?.trim() ?? "";
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() || "https";

  if (forwardedHost && !hostnameLooksLocal(forwardedHost)) {
    const scheme = forwardedProto === "http" ? "http" : "https";
    return `${scheme}://${forwardedHost}`;
  }

  const origin = request.nextUrl.origin;
  try {
    const host = new URL(origin).hostname;
    if (env.VERCEL === "1" && env.VERCEL_URL && hostnameLooksLocal(host)) {
      return `https://${env.VERCEL_URL}`;
    }
  } catch {
    /* ignore invalid origin */
  }
  return origin;
}
