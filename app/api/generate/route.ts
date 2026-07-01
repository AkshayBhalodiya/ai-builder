import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const message = completion.choices[0]?.message?.content?.trim();

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
