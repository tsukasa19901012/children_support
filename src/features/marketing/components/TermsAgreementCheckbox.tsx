"use client";

import Link from "next/link";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function TermsAgreementCheckbox({ checked, onChange }: Props) {
  return (
    <label className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 shrink-0 rounded border-gray-300 text-blue-500 focus:ring-blue-400"
      />
      <span>
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          利用規約
        </Link>
        および
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          プライバシーポリシー
        </Link>
        に同意する
      </span>
    </label>
  );
}
