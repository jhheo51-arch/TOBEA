import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContextLens — 맥락을 먼저 읽는 댓글 분석",
  description: "공개 콘텐츠와 댓글을 함께 읽고 CX 개선 가설을 기록합니다.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
