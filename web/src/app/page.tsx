"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Demo data — Day-1: replace with a fetch to the backend `GET /incidents`.
type Run = {
  trace_id: string;
  ok: boolean;
  failed_steps: string[];
  total_tokens: number;
  cost_usd: number;
  max_latency_ms: number;
  flags: string[];
};

const RUNS: Run[] = [
  { trace_id: "8f2c1", ok: false, failed_steps: ["judge"], total_tokens: 4080, cost_usd: 0.12, max_latency_ms: 5120, flags: ["error", "token_spike"] },
  { trace_id: "a91be", ok: false, failed_steps: ["tool.fetch"], total_tokens: 1200, cost_usd: 0.04, max_latency_ms: 3400, flags: ["error"] },
  { trace_id: "c3d70", ok: true, failed_steps: [], total_tokens: 320, cost_usd: 0.01, max_latency_ms: 210, flags: [] },
];

const flagVariant = (f: string): "destructive" | "secondary" =>
  f === "error" ? "destructive" : "secondary";

export default function Home() {
  const failed = RUNS.filter((r) => !r.ok).length;
  const tokens = RUNS.reduce((n, r) => n + r.total_tokens, 0);
  const cost = RUNS.reduce((n, r) => n + r.cost_usd, 0);
  const chart = RUNS.map((r) => ({ run: r.trace_id, tokens: r.total_tokens }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">🐺 Cerberus</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI SRE copilot — reads your agents&apos; SigNoz telemetry and explains what broke, what it
          cost, and what to do.
        </p>
      </header>

      <div className="mb-6 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Demo data. Day-1: wire these cards to the backend <code>GET /incidents</code> and the chat to{" "}
        <code>POST /ask</code>.
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Runs", value: String(RUNS.length) },
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
        {RUNS.map((r) => (
          <Card key={r.trace_id}>
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
              <code className="text-sm text-muted-foreground">trace {r.trace_id}</code>
              <span className="text-sm">
                {r.ok ? "healthy" : `failed at ${r.failed_steps.join(", ")}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {r.total_tokens.toLocaleString()} tok · ${r.cost_usd.toFixed(2)} · {r.max_latency_ms}{" "}
                ms
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
