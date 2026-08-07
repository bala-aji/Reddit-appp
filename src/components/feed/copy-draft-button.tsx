"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyDraftButtonProps {
  text: string;
  permalink: string;
}

// "Copy & Open Thread" per the PRD §2.2 daily loop — copy-only for MVP,
// never an in-app post (PRD §2.4 non-goal / §7.3 open decision).
export function CopyDraftButton({ text, permalink }: CopyDraftButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(text);
    window.open(permalink, "_blank", "noopener,noreferrer");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button size="sm" onClick={handleClick} variant={copied ? "secondary" : "default"}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : "Copy & Open Thread"}
    </Button>
  );
}
