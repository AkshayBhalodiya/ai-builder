"use client";

import { useState } from "react";

const EXAMPLE_DIFF = `diff --git a/src/auth/login.ts b/src/auth/login.ts
index 4a3f2c1..8b1e9d2 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -12,6 +12,10 @@ export async function loginUser(email: string, password: string) {
   const user = await db.user.findUnique({ where: { email } });
   if (!user) throw new Error("User not found");
 
+  if (user.lockedUntil && user.lockedUntil > new Date()) {
+    throw new Error("Account temporarily locked due to too many failed attempts");
+  }
+
   const valid = await bcrypt.compare(password, user.hashedPassword);
   if (!valid) {
-    throw new Error("Invalid password");
+    await incrementFailedAttempts(user.id);
+    throw new Error("Invalid credentials");
   }`;

type State = "idle" | "loading" | "success" | "error";

function parseCommit(message: string) {
  const lines = message.split("\n");
  const subject = lines[0] || "";
  const body = lines.slice(2).join("\n").trim();

  // extract type/scope/desc from subject line
  const match = subject.match(/^(\w+)(\([^)]+\))?:\s*(.+)$/);
  if (!match) return { type: null, scope: null, desc: subject, body };
  return {
    type: match[1],
    scope: match[2] ? match[2].slice(1, -1) : null,
    desc: match[3],
    body,
    raw: message,
  };
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  feat: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.35)" },
  fix: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.35)" },
  docs: { bg: "rgba(59,130,246,0.12)", text: "#3b82f6", border: "rgba(59,130,246,0.35)" },
  refactor: { bg: "rgba(168,85,247,0.12)", text: "#a855f7", border: "rgba(168,85,247,0.35)" },
  chore: { bg: "rgba(107,114,128,0.12)", text: "#9ca3af", border: "rgba(107,114,128,0.35)" },
  style: { bg: "rgba(251,146,60,0.12)", text: "#fb923c", border: "rgba(251,146,60,0.35)" },
  test: { bg: "rgba(234,179,8,0.12)", text: "#eab308", border: "rgba(234,179,8,0.35)" },
  perf: { bg: "rgba(6,182,212,0.12)", text: "#06b6d4", border: "rgba(6,182,212,0.35)" },
  ci: { bg: "rgba(99,102,241,0.12)", text: "#6366f1", border: "rgba(99,102,241,0.35)" },
  build: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.35)" },
  revert: { bg: "rgba(236,72,153,0.12)", text: "#ec4899", border: "rgba(236,72,153,0.35)" },
};

export default function Home() {
  const [diff, setDiff] = useState("");
  const [result, setResult] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!diff.trim()) return;
    setState("loading");
    setError("");
    setResult("");
    setCopied(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data.message);
      setState("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setDiff("");
    setResult("");
    setState("idle");
    setError("");
    setCopied(false);
  };

  const parsed = result ? parseCommit(result) : null;
  const typeColor = parsed?.type ? (TYPE_COLORS[parsed.type] ?? TYPE_COLORS.chore) : null;

  return (
    <div className="app-shell">
      {/* Background glow */}
      <div className="bg-glow" />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span className="logo-text">CommitAI</span>
          </div>
          <div className="header-badge">
            <span className="badge-dot" />
            GPT-4o-mini
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="app-main">
        <div className="hero">
          <h1 className="hero-title">
            Stop writing{" "}
            <span className="hero-accent">lazy commits</span>
          </h1>
          <p className="hero-subtitle">
            Paste a <code className="inline-code">git diff</code> — get a clean{" "}
            <a
              href="https://www.conventionalcommits.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              conventional commit
            </a>{" "}
            message back in seconds.
          </p>
        </div>

        <div className="card">
          {/* Input section */}
          <div className="section">
            <div className="section-header">
              <label htmlFor="diff-input" className="section-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Git Diff
              </label>
              <button
                className="btn-ghost"
                onClick={() => setDiff(EXAMPLE_DIFF)}
                disabled={state === "loading"}
              >
                Load example
              </button>
            </div>

            <textarea
              id="diff-input"
              className="diff-textarea"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder={"Paste your `git diff` output here…\n\ndiff --git a/src/file.ts b/src/file.ts\n--- a/src/file.ts\n+++ b/src/file.ts\n@@ -1,4 +1,6 @@\n ..."}
              spellCheck={false}
              disabled={state === "loading"}
            />

            <div className="input-footer">
              <span className="char-count">
                {diff.length > 0 ? `${diff.length.toLocaleString()} chars` : ""}
              </span>
              <div className="btn-row">
                {(state === "success" || state === "error") && (
                  <button className="btn-ghost" onClick={reset}>
                    Reset
                  </button>
                )}
                <button
                  id="generate-btn"
                  className={`btn-primary ${state === "loading" ? "loading" : ""}`}
                  onClick={generate}
                  disabled={!diff.trim() || state === "loading"}
                >
                  {state === "loading" ? (
                    <>
                      <span className="spinner" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Generate commit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          {(state === "success" || state === "error" || state === "loading") && (
            <div className="divider" />
          )}

          {/* Loading skeleton */}
          {state === "loading" && (
            <div className="section">
              <div className="section-label" style={{ marginBottom: "12px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Commit Message
              </div>
              <div className="skeleton-block">
                <div className="skeleton-line w-60" />
                <div className="skeleton-line w-full" style={{ marginTop: 16 }} />
                <div className="skeleton-line w-4/5" />
              </div>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="section">
              <div className="error-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Result */}
          {state === "success" && parsed && (
            <div className="section result-section">
              <div className="section-header">
                <div className="section-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Commit Message
                </div>
                <button
                  id="copy-btn"
                  className={`btn-copy ${copied ? "copied" : ""}`}
                  onClick={copy}
                >
                  {copied ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="commit-output">
                {/* Subject line */}
                <div className="commit-subject">
                  {typeColor && (
                    <span
                      className="commit-type"
                      style={{
                        background: typeColor.bg,
                        color: typeColor.text,
                        border: `1px solid ${typeColor.border}`,
                      }}
                    >
                      {parsed.type}
                    </span>
                  )}
                  {parsed.scope && (
                    <span className="commit-scope">({parsed.scope})</span>
                  )}
                  {parsed.type && <span className="commit-colon">:</span>}
                  <span className="commit-desc">{parsed.desc}</span>
                </div>

                {/* Body */}
                {parsed.body && (
                  <p className="commit-body">{parsed.body}</p>
                )}
              </div>

              {/* Raw copyable */}
              <div className="commit-raw">
                <pre>{result}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="tips">
          <div className="tip">
            <span className="tip-icon">⌨️</span>
            Run <code className="inline-code">git diff --staged</code> or <code className="inline-code">git diff HEAD~1</code> and paste the output above
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        Built with Next.js · Powered by GPT-4o-mini · Conventional Commits spec
      </footer>
    </div>
  );
}
