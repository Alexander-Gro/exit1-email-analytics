"use client";

import * as React from "react";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_KEY = process.env.NEXT_PUBLIC_ANALYTICS_API_KEY ?? "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://exit1-email-analytics.vercel.app";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

type Step = "form" | "snippet";

interface Campaign {
  id: string;
  name: string;
}

export function AddCampaignModal({ onClose, onCreated }: Props) {
  const [step, setStep] = React.useState<Step>("form");
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const pixelSnippet = campaign
    ? `<img src="${BASE_URL}/api/track/open/${campaign.id}" width="1" height="1" style="display:none" alt="" />`
    : "";

  const clickExample = campaign
    ? `${BASE_URL}/api/track/click/${campaign.id}?url=https://exit1.dev`
    : "";

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Campaign name is required."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
        body: JSON.stringify({ name: name.trim(), subject: subject.trim() || undefined, html: "<!-- placeholder -->" }),
      });
      if (!res.ok) throw new Error("Failed to create campaign.");
      const data = await res.json();
      setCampaign(data);
      setStep("snippet");
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">
              {step === "form" ? "Add campaign" : `Campaign created`}
            </h2>
            {step === "form" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                For emails already live — get a tracking snippet to paste in manually.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {step === "form" ? (
          <>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Campaign name *</label>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. May Newsletter"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject line <span className="text-muted-foreground/50">(optional)</span></label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. What's new at exit1.dev"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={loading}>
                {loading ? "Creating…" : "Create campaign"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-5 space-y-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
                <span className="font-mono text-foreground">{campaign?.id.slice(0, 8)}…</span>
                <span>·</span>
                <span>{campaign?.name}</span>
              </div>

              {/* Pixel snippet */}
              <div>
                <p className="text-xs font-medium mb-2">Open tracking pixel</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Paste this just before <code className="font-mono bg-muted px-1 rounded">{"</body>"}</code> in your email HTML.
                </p>
                <div className="relative">
                  <pre className="bg-muted border border-border rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto pr-12 whitespace-pre-wrap break-all">
                    {pixelSnippet}
                  </pre>
                  <button
                    onClick={() => copy(pixelSnippet, "pixel")}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {copied === "pixel" ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {/* Click tracking */}
              <div>
                <p className="text-xs font-medium mb-2">Click tracking — wrap your links</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Replace each <code className="font-mono bg-muted px-1 rounded">href</code> with this pattern. UTM params on the destination are preserved.
                </p>
                <div className="relative">
                  <pre className="bg-muted border border-border rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto pr-12 whitespace-pre-wrap break-all">
                    {`${BASE_URL}/api/track/click/${campaign?.id}?url=YOUR_URL`}
                  </pre>
                  <button
                    onClick={() => copy(clickExample, "click")}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {copied === "click" ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-5 py-4 border-t border-border">
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
