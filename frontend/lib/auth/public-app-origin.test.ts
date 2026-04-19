import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resolvePublicAppOrigin } from "@/lib/auth/public-app-origin";

function req(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, { headers });
}

describe("resolvePublicAppOrigin", () => {
  it("uses APP_ORIGIN when set", () => {
    const r = req("http://localhost:3000/auth/google");
    expect(resolvePublicAppOrigin(r, { APP_ORIGIN: "https://prod.example/" })).toBe(
      "https://prod.example",
    );
  });

  it("uses NEXT_PUBLIC_SITE_URL when APP_ORIGIN is unset", () => {
    const r = req("http://localhost:3000/");
    expect(resolvePublicAppOrigin(r, { NEXT_PUBLIC_SITE_URL: "https://app.vercel.app" })).toBe(
      "https://app.vercel.app",
    );
  });

  it("prefers x-forwarded-host when not localhost", () => {
    const r = req("http://localhost:3000/auth/callback", {
      "x-forwarded-host": "my-app.vercel.app",
      "x-forwarded-proto": "https",
    });
    expect(resolvePublicAppOrigin(r, {})).toBe("https://my-app.vercel.app");
  });

  it("on Vercel, falls back to VERCEL_URL when origin is localhost", () => {
    const r = req("http://localhost:3000/auth/callback");
    expect(
      resolvePublicAppOrigin(r, {
        VERCEL: "1",
        VERCEL_URL: "jam-session-assistant-git-main-user.vercel.app",
      }),
    ).toBe("https://jam-session-assistant-git-main-user.vercel.app");
  });

  it("returns request origin in local dev without overrides", () => {
    const r = req("http://localhost:3000/foo");
    expect(resolvePublicAppOrigin(r, {})).toBe(r.nextUrl.origin);
  });
});
