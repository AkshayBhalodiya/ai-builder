import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommitAI — AI Commit Message Generator",
  description:
    "Paste a git diff and get a clean conventional commit message back in seconds. Powered by GPT-4o-mini.",
  keywords: ["git", "commit", "conventional commits", "AI", "developer tools"],
  openGraph: {
    title: "CommitAI — AI Commit Message Generator",
    description: "Stop writing lazy commits. Paste a git diff, get a clean conventional commit message.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
