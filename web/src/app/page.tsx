import Link from "next/link";

const REPO = "https://github.com/CodeMuscle/cerberus";

function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#16171b" />
      <rect x="6.5" y="15.5" width="4" height="9.5" rx="2" fill="#ff7a45" />
      <rect x="14" y="8.5" width="4" height="16.5" rx="2" fill="#ff7a45" />
      <rect x="21.5" y="12" width="4" height="13" rx="2" fill="#ff9d70" />
    </svg>
  );
}

const HEADS = [
  {
    n: "01",
    k: "Observe",
    body: "Every agent run lands in SigNoz as OpenTelemetry traces — token usage, cost, latency, and errors, per step. Cerberus emits the telemetry and reads it back.",
  },
  {
    n: "02",
    k: "Explain",
    body: "The copilot reads the ranked incidents and answers in plain English, grounded only in the facts it was given, and cites the trace_id. No speculation.",
  },
  {
    n: "03",
    k: "Prevent",
    body: "One click writes the SigNoz alert rule that would have caught the incident — created through the same MCP server Cerberus reads from.",
  },
];

const PIPELINE = ["Agent", "OpenTelemetry", "SigNoz", "MCP server", "Cerberus", "Alert rule"];

const STACK = [
  "SigNoz",
  "OpenTelemetry",
  "SigNoz MCP server",
  "Query Builder v5",
  "Claude",
  "FastAPI",
  "Next.js",
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav — edge-aligned, minimal */}
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Mark size={26} />
          <span className="text-sm font-semibold tracking-tight">Cerberus</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 text-sm">
          <a
            href={REPO}
            className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-3.5 py-1.5 font-medium text-primary-foreground transition-transform hover:-translate-y-px"
          >
            Open dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <p className="rise inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span className="live-dot size-1.5 rounded-full bg-primary" />
          AI SRE Copilot · Agents of SigNoz
        </p>
        <h1 className="rise mt-7 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
          Your AI agent&apos;s failures,{" "}
          <span className="text-primary">explained.</span>
        </h1>
        <p className="rise mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Cerberus reads your agent&apos;s SigNoz traces, ranks every run by failure and spend,
          explains the worst ones with trace citations, and writes the alert that would have caught
          them.
        </p>
        <div className="rise mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
          >
            Open the dashboard →
          </Link>
          <a
            href={REPO}
            className="rounded-xl border border-border/70 bg-card/40 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card"
          >
            View source
          </a>
        </div>
      </header>

      {/* The three heads */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Three heads, one watchdog
            </h2>
            <p className="hidden max-w-xs text-sm text-muted-foreground sm:block">
              Traces, metrics, and logs — observe, explain, and prevent.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {HEADS.map((h) => (
              <div
                key={h.n}
                className="group rounded-2xl border border-border/70 bg-card/50 p-6 backdrop-blur-sm transition-colors hover:bg-card"
              >
                <div className="flex items-center gap-3">
                  <span className="tnum text-sm font-semibold text-primary">{h.n}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{h.k}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — real pipeline */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cerberus both emits telemetry to SigNoz and consumes it back — the read path speaks MCP,
            so the same tool surface an AI client gets is the surface Cerberus is built on.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-2">
            {PIPELINE.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span
                  className={`tnum rounded-lg border px-3.5 py-2 text-sm ${
                    step === "Cerberus"
                      ? "border-primary/50 bg-primary/10 font-semibold text-primary"
                      : "border-border/70 bg-card/50 text-foreground"
                  }`}
                >
                  {step}
                </span>
                {i < PIPELINE.length - 1 && (
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reproducible */}
      <section className="border-t border-border/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2 md:py-20">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Reproducible in one command
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              The repo ships <code className="text-foreground">casting.yaml</code> and its lock. One
              Foundry command brings up SigNoz and the MCP server — no click-built setup to
              reproduce.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {STACK.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border/70 bg-card/40 px-3 py-1 text-xs text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-[oklch(0.14_0.006_264)] p-5 font-mono text-sm leading-relaxed">
            <p className="text-muted-foreground"># bring up SigNoz + the MCP server</p>
            <p className="mt-1">
              <span className="text-primary">$</span> foundryctl cast -f casting.yaml
            </p>
            <p className="mt-4 text-muted-foreground"># read incidents, explain, arm the alert</p>
            <p className="mt-1">
              <span className="text-primary">$</span> uvicorn cerberus.api:app
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
          <div className="mx-auto mb-6 w-fit">
            <Mark size={40} />
          </div>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            See what your agent broke, and what it cost.
          </h2>
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
            >
              Open the dashboard →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Cerberus · observes and consumes SigNoz over OpenTelemetry + the MCP server.</p>
          <p>
            Built with AI assistance for the Agents of SigNoz hackathon ·{" "}
            <a href={REPO} className="text-foreground hover:text-primary">
              source
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
