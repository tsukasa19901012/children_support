import Link from "next/link";
import { BRAND } from "../../../lib/brand";
import { LegalFooter } from "./LegalFooter";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
};

export function MarketingShell({
  children,
  title,
  subtitle,
  backHref = "/login",
  backLabel = "ログインへ戻る",
}: Props) {
  return (
    <div className="min-h-dvh bg-[#f4f7fb] px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-lg">
        <p className="text-center text-xs font-medium text-blue-600 mb-4">
          {BRAND.name}
        </p>
        <article className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
          <h1 className="text-lg font-bold text-gray-800 mb-1">{title}</h1>
          {subtitle ? (
            <p className="text-xs text-gray-400 mb-6">{subtitle}</p>
          ) : (
            <div className="mb-6" />
          )}
          {children}
          <p className="mt-8 text-center">
            <Link href={backHref} className="text-sm text-blue-600 underline">
              {backLabel}
            </Link>
          </p>
        </article>
        <LegalFooter className="mt-6" />
      </div>
    </div>
  );
}
