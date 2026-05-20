"use client";

import dynamic from "next/dynamic";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

type Props = { children: string };

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-1 last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => {
    const safe = href?.startsWith("http") || href?.startsWith("https");
    return safe ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-blue-600"
      >
        {children}
      </a>
    ) : (
      <span>{children}</span>
    );
  },
};

/** 初回チャット表示時のバンドル負荷を抑えるため遅延読み込み */
export function ChatMarkdown({ children }: Props) {
  return (
    <ReactMarkdown components={markdownComponents}>{children}</ReactMarkdown>
  );
}
