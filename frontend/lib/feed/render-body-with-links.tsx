"use client";

import type { ReactNode } from "react";

/** Renders plain text with http(s) URLs as external links (same rules as the friend feed). */
export function renderBodyWithLinks(body: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  const re = /https?:\/\/[^\s]+/gi;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      out.push(<span key={`t-${key++}`}>{body.slice(last, m.index)}</span>);
    }
    const href = m[0];
    out.push(
      <a
        key={`a-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-[#6ee7b7] underline decoration-[#6ee7b7]/50 underline-offset-2 hover:decoration-[#6ee7b7]"
      >
        {href}
      </a>,
    );
    last = m.index + href.length;
  }
  if (last < body.length) {
    out.push(<span key={`t-${key++}`}>{body.slice(last)}</span>);
  }
  return out.length ? out : [<span key="empty">{body}</span>];
}
