import { NextResponse } from "next/server";
import { fetchLinkPreview } from "@/lib/platform/link-preview";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const url =
    typeof body === "object" && body !== null && "url" in body ? String((body as { url: unknown }).url) : "";
  const out = await fetchLinkPreview(url);
  if (!out.ok) {
    return NextResponse.json({ error: out.error, preview: undefined });
  }
  return NextResponse.json({ error: null, preview: out.data });
}
