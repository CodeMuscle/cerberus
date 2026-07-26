"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const WINDOWS = [
  { label: "15m", minutes: 15 },
  { label: "1h", minutes: 60 },
  { label: "6h", minutes: 360 },
  { label: "24h", minutes: 1440 },
];

const shortId = (id: string) => id.slice(0, 8);

const usd = (n: number) =>
  n >= 0.01 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;

const FLAG = {
  error: { label: "error", color: "var(--destructive)" },
  token_spike: { label: "token spike", color: "var(--warn)" },
  cost_spike: { label: "cost spike", color: "var(--warn)" },
} as const;

function Flag({ name }: { name: string }) {
  const f = FLAG[name as keyof typeof FLAG] ?? { label: name, color: "var(--muted-foreground)" };
  return (
    <span
      className="tnum inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ borderColor: f.color, color: f.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: f.color }} />
      {f.label}
    </span>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ember" | "warn";
}) {
  const bar =
    tone === "ember" ? "var(--primary)" : tone === "warn" ? "var(--warn)" : "var(--border)";
  return (
    <Card className="relative overflow-hidden rounded-xl border-border/70 bg-card/60 py-0 backdrop-blur-sm">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: bar }} />
      <CardContent className="px-5 py-4">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="tnum mt-2 text-3xl font-semibold leading-none tracking-tight">{value}</p>
        {sub && <p className="tnum mt-2 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [minutes, setMinutes] = useState(1440);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("What went wrong in the last few runs and what did it cost?");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [guard, setGuard] = useState<string | null>(null);
  const [arming, setArming] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/incidents?minutes=${minutes}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `incidents returned ${res.status}`);
      }
      setRuns(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, [minutes]);

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
        body: JSON.stringify({ question, minutes }),
      });
      if (!res.ok) throw new Error(`ask returned ${res.status}`);
      setAnswer((await res.json()).answer);
    } catch (e) {
      setAnswer(`Copilot unavailable: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAsking(false);
    }
  }

  async function arm() {
    setArming(true);
    setGuard(null);
    try {
      const res = await fetch(`${API}/guard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.detail ?? `guard returned ${res.status}`);
      setGuard(
        body.created
          ? `Armed “${body.alert}” → ${body.channel}.`
          : `Already armed: “${body.alert}”.`,
      );
    } catch (e) {
      setGuard(`Couldn't arm: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setArming(false);
    }
  }

  const failed = runs.filter((r) => !r.ok).length;
  const tokens = runs.reduce((n, r) => n + r.total_tokens, 0);
  const cost = runs.reduce((n, r) => n + r.cost_usd, 0);
  const chart = runs.map((r) => ({ run: shortId(r.trace_id), tokens: r.total_tokens, ok: r.ok }));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4 px-6 py-3.5 md:px-10">
          <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
              <rect width="32" height="32" rx="7" fill="#16171b" />
              <rect x="6.5" y="15.5" width="4" height="9.5" rx="2" fill="#ff7a45" />
              <rect x="14" y="8.5" width="4" height="16.5" rx="2" fill="#ff7a45" />
              <rect x="21.5" y="12" width="4" height="13" rx="2" fill="#ff9d70" />
            </svg>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Cerberus</p>
              <p className="text-[0.66rem] uppercase tracking-[0.16em] text-muted-foreground">
                SRE Copilot
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="live-dot size-2 rounded-full bg-primary" />
              live · SigNoz
            </span>
            <div className="flex items-center rounded-lg border border-border/70 bg-card/50 p-0.5">
              {WINDOWS.map((w) => (
                <button
                  key={w.minutes}
                  onClick={() => setMinutes(w.minutes)}
                  className={`tnum rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    minutes === w.minutes
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 md:px-10 md:py-10">
        <div className="mb-2">
          <h1 className="text-lg font-semibold tracking-tight">Agent telemetry</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ranked incidents from your agent&apos;s SigNoz traces — what failed, what it cost, and the
            alert that would have caught it.
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Runs" value={String(runs.length)} sub="in window" />
          <Stat
            label="Failed"
            value={String(failed)}
            sub={runs.length ? `${Math.round((failed / runs.length) * 100)}% of runs` : "—"}
            tone={failed ? "ember" : undefined}
          />
          <Stat label="Tokens" value={tokens.toLocaleString()} sub="input + output" />
          <Stat
            label="Est. cost"
            value={usd(cost)}
            sub="gen_ai.usage.cost_usd"
            tone={cost > 0.05 ? "warn" : undefined}
          />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card className="rise rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
              <CardContent className="px-5 py-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold">Token usage by run</h2>
                  <span className="text-xs text-muted-foreground">ember = failed</span>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <XAxis
                        dataKey="run"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        stroke="var(--muted-foreground)"
                      />
                      <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                        {chart.map((c, i) => (
                          <Cell
                            key={i}
                            fill={c.ok ? "var(--muted-foreground)" : "var(--primary)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                Incidents
                <span className="text-xs font-normal text-muted-foreground">worst first</span>
              </h2>
              <div className="space-y-2.5">
                {!loaded &&
                  !error &&
                  [0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[58px] animate-pulse rounded-xl border border-border/70 bg-card/40"
                    />
                  ))}
                {loaded && runs.length === 0 && !error && (
                  <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    No runs in this window. Generate some with{" "}
                    <code className="text-foreground">curl &quot;localhost:8090/run?fail=1&quot;</code>.
                  </p>
                )}
                {runs.map((r) => (
                  <Card
                    key={r.trace_id}
                    className="rise rounded-xl border-border/70 bg-card/50 py-0 backdrop-blur-sm transition-colors hover:bg-card"
                  >
                    <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-5 py-3.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: r.ok ? "var(--ok)" : "var(--destructive)" }}
                      />
                      <code className="tnum text-sm text-foreground">{shortId(r.trace_id)}</code>
                      <span className="text-sm text-muted-foreground">
                        {r.ok ? "healthy" : `failed at ${r.failed_steps.join(" · ")}`}
                      </span>
                      <span className="tnum ml-auto flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{r.total_tokens.toLocaleString()} tok</span>
                        <span>{usd(r.cost_usd)}</span>
                        <span>{r.max_latency_ms} ms</span>
                      </span>
                      {r.flags.length > 0 && (
                        <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                          {r.flags.map((f) => (
                            <Flag key={f} name={f} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="rise rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
              <CardContent className="space-y-4 px-5 py-5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" />
                  <h2 className="text-sm font-semibold">Ask the copilot</h2>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !asking && ask()}
                    placeholder="Ask about failures or cost…"
                    className="bg-background/60"
                  />
                  <Button onClick={ask} disabled={asking || question.trim() === ""}>
                    {asking ? "Thinking…" : "Ask"}
                  </Button>
                </div>
                {answer && (
                  <p className="rounded-lg border border-border/70 bg-background/50 p-3.5 text-sm leading-relaxed text-foreground">
                    {answer}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Grounded only in the ranked runs above — every answer cites a trace_id.
                </p>
              </CardContent>
            </Card>

            <Card className="rise rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
              <CardContent className="space-y-3 px-5 py-5">
                <h2 className="text-sm font-semibold">Close the loop</h2>
                <p className="text-sm text-muted-foreground">
                  Create the SigNoz alert rule that would have caught these token spikes — written back
                  through the same MCP server Cerberus reads from.
                </p>
                <Button
                  onClick={arm}
                  disabled={arming}
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  {arming ? "Arming…" : "Arm token-spike alert"}
                </Button>
                {guard && <p className="text-xs text-muted-foreground">{guard}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/70 px-6 py-6 md:px-10">
        <p className="text-xs text-muted-foreground">
          Cerberus · observes and consumes SigNoz over OpenTelemetry + the SigNoz MCP server.
        </p>
      </footer>
    </div>
  );
}
