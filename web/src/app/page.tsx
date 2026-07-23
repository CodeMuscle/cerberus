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

const STACK = ["SigNoz", "OpenTelemetry", "SigNoz MCP server", "FastAPI", "Next.js"];

export default function Landing() {
  return (
    <div className="min-h-dvh">
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

      <header className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-16 text-center md:pt-24">
        <p className="rise text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          An AI SRE copilot for the Agents of SigNoz
        </p>
        <h1 className="rise mt-6 text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
          Your AI agent&apos;s failures,{" "}
          <span className="text-primary">explained.</span>
        </h1>
        <p className="rise mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Cerberus reads your agent&apos;s SigNoz traces, ranks every run by failure and spend,
          explains the worst ones with trace citations, and writes the alert that would have caught
          them.
        </p>
        <div className="rise mt-9 flex flex-wrap items-center justify-center gap-3">
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

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Three heads, one watchdog
          </h2>
          <div className="mx-auto mt-10 grid gap-4 md:grid-cols-3">
            {HEADS.map((h) => (
              <div
                key={h.n}
                className="flex flex-col items-center rounded-2xl border border-border/70 bg-card/50 p-6 text-center backdrop-blur-sm transition-colors hover:bg-card"
              >
                <span className="tnum text-sm font-semibold text-primary">{h.n}</span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{h.k}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-16 text-center md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cerberus both emits telemetry to SigNoz and consumes it back — the read path speaks MCP,
            so the same tool surface an AI client gets is the surface Cerberus is built on.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
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

      <section className="border-t border-border/60">
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Reproducible in one command
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            The repo ships <code className="text-foreground">casting.yaml</code> and its lock. One
            Foundry command brings up SigNoz and the MCP server — no click-built setup to reproduce.
          </p>
          <div className="mt-8 w-full rounded-2xl border border-border/70 bg-[oklch(0.14_0.006_264)] p-5 text-left font-mono text-sm leading-relaxed">
            <p className="text-muted-foreground"># bring up SigNoz + the MCP server</p>
            <p className="mt-1">
              <span className="text-primary">$</span> foundryctl cast -f casting.yaml
            </p>
            <p className="mt-4 text-muted-foreground"># read incidents, explain, arm the alert</p>
            <p className="mt-1">
              <span className="text-primary">$</span> uvicorn cerberus.api:app
            </p>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {STACK.join("  ·  ")}
          </p>
        </div>
      </section>

      <footer className="border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-14">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div className="max-w-xs">
              <Link href="/" className="flex items-center gap-2.5">
                <Mark size={26} />
                <span className="text-sm font-semibold tracking-tight">Cerberus</span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                An AI SRE copilot that reads your agent&apos;s SigNoz telemetry and explains what
                broke, what it cost, and what to do.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Product
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <Link href="/dashboard" className="text-foreground transition-colors hover:text-primary">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <a href={REPO} className="text-foreground transition-colors hover:text-primary">
                    Source code
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Built on
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a href="https://signoz.io" className="text-foreground transition-colors hover:text-primary">
                    SigNoz
                  </a>
                </li>
                <li>
                  <a href="https://opentelemetry.io" className="text-foreground transition-colors hover:text-primary">
                    OpenTelemetry
                  </a>
                </li>
                <li>
                  <a href="https://github.com/SigNoz/foundry" className="text-foreground transition-colors hover:text-primary">
                    Foundry
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Hackathon
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a href="https://www.wemakedevs.org/hackathons/signoz" className="text-foreground transition-colors hover:text-primary">
                    Agents of SigNoz
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Cerberus</p>
            <p>Built with AI assistance for the Agents of SigNoz hackathon.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
