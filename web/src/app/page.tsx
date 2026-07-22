"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const API = process.env.NEXT_PUBLIC_CERBERUS_API ?? "http://localhost:8030";

type Run = {
  trace_id: string;
  ok: boolean;
  failed_steps: string[];
  total_tokens: number;
  cost_usd: number;
  max_latency_ms: number;
  flags: string[];
};

const flagVariant = (f: string): "destructive" | "secondary" =>
  f === "error" ? "destructive" : "secondary";

const shortId = (id: string) => id.slice(0, 8);

export default function Home() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("What went wrong in the last few runs?");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/incidents`, { cache: "no-store" });
      if (!res.ok) throw new Error(`incidents returned ${res.status}`);
      setRuns(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Poll so the panel reflects new agent runs without a manual reload. The first
  // load is deferred to a task rather than run in the effect body, so the fetch
  // never resolves state synchronously during render.
  useEffect(() => {
    const first = setTimeout(load, 0);
    const poll = setInterval(load, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [load]);

  async function ask() {
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(`ask returned ${res.status}`);
      setAnswer((await res.json()).answer);
    } catch (e) {
      setAnswer(`Copilot unavailable: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAsking(false);
    }
  }

  const failed = runs.filter((r) => !r.ok).length;
  const tokens = runs.reduce((n, r) => n + r.total_tokens, 0);
  const cost = runs.reduce((n, r) => n + r.cost_usd, 0);
  const chart = runs.map((r) => ({ run: shortId(r.trace_id), tokens: r.total_tokens }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">🐺 Cerberus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI SRE copilot — reads your agents&apos; SigNoz telemetry and explains what broke, what it
          cost, and what to do.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          Can&apos;t reach the Cerberus API at <code>{API}</code> — {error}. Start it with{" "}
          <code>uvicorn cerberus.api:app --port 8030</code>.
        </div>
      )}

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Runs", value: String(runs.length) },
          { label: "Failed", value: String(failed) },
          { label: "Tokens", value: tokens.toLocaleString() },
          { label: "Est. cost", value: `$${cost.toFixed(2)}` },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Ask the copilot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !asking && ask()}
              placeholder="Ask about your agent's failures or cost…"
            />
            <Button onClick={ask} disabled={asking || question.trim() === ""}>
              {asking ? "Thinking…" : "Ask"}
            </Button>
          </div>
          {answer && (
            <p className="rounded-md bg-muted p-3 text-sm leading-relaxed">{answer}</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Token usage by run</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <XAxis dataKey="run" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} />
              <Bar dataKey="tokens" radius={4} className="fill-primary" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold">Incidents (worst first)</h2>
      <div className="grid gap-3">
        {runs.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            No runs in range. Generate some with{" "}
            <code>curl &quot;localhost:8090/run?fail=1&quot;</code>.
          </p>
        )}
        {runs.map((r) => (
          <Card key={r.trace_id}>
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
              <code className="text-sm text-muted-foreground">trace {shortId(r.trace_id)}</code>
              <span className="text-sm">
                {r.ok ? "healthy" : `failed at ${r.failed_steps.join(", ")}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {r.total_tokens.toLocaleString()} tok · ${r.cost_usd.toFixed(2)} ·{" "}
                {r.max_latency_ms} ms
              </span>
              <div className="ml-auto flex gap-2">
                {r.flags.length === 0 ? (
                  <Badge variant="outline">ok</Badge>
                ) : (
                  r.flags.map((f) => (
                    <Badge key={f} variant={flagVariant(f)}>
                      {f}
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
