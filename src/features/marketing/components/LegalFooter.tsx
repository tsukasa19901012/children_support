import Link from "next/link";

const LINKS = [
  { href: "/lp", label: "サービス紹介" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシー" },
  { href: "/legal", label: "特商法表記" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap justify-center gap-x-3 gap-y-2 text-[11px] text-gray-400 ${className}`}
      aria-label="法務・サポート"
    >
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className="hover:text-gray-600 underline">
          {label}
        </Link>
      ))}
    </nav>
  );
}
