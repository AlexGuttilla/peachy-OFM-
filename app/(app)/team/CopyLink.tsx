"use client";

import { useState } from "react";

/** Shows the setup link and copies it, so it can go straight into a message. */
export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some in-app browsers; the text is selectable.
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-accent-soft px-2.5 py-2 text-xs">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
