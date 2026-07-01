import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY?.trim();

const isPlaceholderKey = (value: string) =>
  !value ||
  value.includes("...") ||
  value === "sk-..." ||
  value.startsWith("your_") ||
  value.includes("<") ||
  value.includes(">" );

const client = apiKey && !isPlaceholderKey(apiKey) ? new OpenAI({ apiKey }) : null;

const SYSTEM_PROMPT = `You are an expert software engineer who writes clean, precise git commit messages following the Conventional Commits specification.

Given a git diff, analyze the changes and produce a commit message with this EXACT format:

type(scope): subject

body

Rules:
- type must be one of: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
- scope is optional but preferred (e.g., the module/file/component changed)
- subject: imperative mood, max 72 chars, no period at end, lowercase after the colon
- body: 2-3 sentences max explaining WHAT changed and WHY (not HOW). Wrap at 72 chars.
- Separate subject from body with a blank line
- Output ONLY the commit message, nothing else — no markdown, no backticks, no explanation`;

function inferFallbackCommitMessage(diff: string) {
  const normalized = diff.toLowerCase();
  const files = Array.from(diff.matchAll(/^(?:diff --git a\/)?([^\s]+)(?: b\/)?/gm))
    .map((match) => match[1])
    .filter(Boolean);
  const primaryFile = files[0]?.replace(/^a\//, "") || "project";
  const scope = primaryFile.split("/").slice(0, 2).join("/") || "app";

  const type =
    normalized.includes("fix") || normalized.includes("bug") || normalized.includes("error")
      ? "fix"
      : normalized.includes("new") || normalized.includes("add") || normalized.includes("introduce")
        ? "feat"
        : normalized.includes("test")
          ? "test"
          : normalized.includes("doc")
            ? "docs"
            : normalized.includes("refactor") || normalized.includes("cleanup")
              ? "refactor"
              : normalized.includes("style") || normalized.includes("css") || normalized.includes("ui")
                ? "style"
                : normalized.includes("perf") || normalized.includes("optimiz")
                  ? "perf"
                  : normalized.includes("build") || normalized.includes("deploy") || normalized.includes("ci")
                    ? "build"
                    : normalized.includes("revert")
                      ? "revert"
                      : "chore";

  const action =
    type === "fix"
      ? "resolve"
      : type === "feat"
        ? "add"
        : type === "docs"
          ? "update"
          : type === "refactor"
            ? "refactor"
            : type === "test"
              ? "improve"
              : type === "style"
                ? "adjust"
                : type === "perf"
                  ? "optimize"
                  : type === "build"
                    ? "update"
                    : "update";

  const subject = `${type}(${scope}): ${action} ${primaryFile}`.slice(0, 72);
  const body = "Update the relevant behavior and keep the change aligned with the current diff.";

  return `${subject}\n\n${body}`;
}

export async function POST(req: NextRequest) {
  try {
    const { diff } = await req.json();

    if (!diff || typeof diff !== "string" || diff.trim().length === 0) {
      return NextResponse.json(
        { error: "A non-empty git diff is required." },
        { status: 400 }
      );
    }

    if (diff.length > 20000) {
      return NextResponse.json(
        { error: "Diff is too large (max 20,000 characters). Try a smaller diff." },
        { status: 400 }
      );
    }

    if (!client) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not configured. Add a valid OPENAI_API_KEY to your environment and restart the dev server before generating commit messages.",
        },
        { status: 500 }
      );
    }

    let message: string | undefined;

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here is the git diff:\n\n\`\`\`diff\n${diff}\n\`\`\``,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
      });

      message = completion.choices[0]?.message?.content?.trim();
    } catch (err: unknown) {
      const openAiMessage = err instanceof Error ? err.message : "";
      if (/insufficient_quota|rate limit|429|quota/i.test(openAiMessage)) {
        message = inferFallbackCommitMessage(diff);
      } else {
        throw err;
      }
    }

    if (!message) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message });
  } catch (err: unknown) {
    console.error("Generate API error:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

    if (/invalid_api_key|incorrect api key|401/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "The configured OpenAI API key is invalid or expired. Update OPENAI_API_KEY and try again.",
        },
        { status: 500 }
      );
    }

    if (/insufficient_quota|rate limit|429|quota/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "OpenAI quota was exhausted. A fallback commit message is being generated locally instead.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
