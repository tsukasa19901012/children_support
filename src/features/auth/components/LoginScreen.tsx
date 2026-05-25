import type { FormEvent, RefObject } from "react";
import { BRAND } from "../../../lib/brand";
import { BrandMark } from "./BrandMark";

const VALUE_POINTS = [
  { icon: "💭", text: "うちの子のことを覚えながら相談" },
  { icon: "🤝", text: "否定しない、落ち着いた返答" },
  { icon: "✉️", text: "パスワード不要・メールだけで始められる" },
] as const;

type Status = "idle" | "loading" | "code_sent" | "verifying" | "error";

type Props = {
  phase: "email" | "code";
  email: string;
  code: string;
  status: Status;
  errorMessage: string;
  codeInputRef: RefObject<HTMLInputElement | null>;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: (e: FormEvent) => void;
  onVerifyCode: (e: FormEvent) => void;
  onResend: () => void;
  onChangeEmail: () => void;
};

export function LoginScreen({
  phase,
  email,
  code,
  status,
  errorMessage,
  codeInputRef,
  onEmailChange,
  onCodeChange,
  onSendCode,
  onVerifyCode,
  onResend,
  onChangeEmail,
}: Props) {
  const isCodePhase = phase === "code";

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#f4f7fb] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-sky-100/70 via-white to-amber-50/50"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        {/* Hero */}
        <header className="mb-8 shrink-0 text-center">
          <div className="mb-4 flex shrink-0 justify-center">
            <BrandMark size="xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {BRAND.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-blue-600">
            {BRAND.subtitle}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {BRAND.tagline}
          </p>
        </header>

        {/* Form card */}
        <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-xl shadow-gray-200/50 backdrop-blur-sm">
          <p className="mb-5 text-center text-sm font-semibold text-gray-800">
            {isCodePhase ? "確認コードを入力" : "はじめる"}
          </p>

          {isCodePhase ? (
            <form onSubmit={onVerifyCode} className="space-y-4">
              <p className="text-center text-sm leading-relaxed text-gray-600">
                <span className="font-medium text-gray-800">{email}</span>
                <br />
                に6桁のコードを送りました
              </p>

              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                disabled={status === "verifying"}
                autoComplete="one-time-code"
                aria-label="確認コード"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-center text-2xl tracking-[0.35em] outline-none transition-colors focus:border-blue-400 focus:bg-white disabled:opacity-60"
              />

              {errorMessage && (
                <p className="text-center text-xs leading-relaxed text-red-500" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "verifying" || code.length < 6}
                className="w-full rounded-2xl bg-blue-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:shadow-none"
              >
                {status === "verifying" ? "確認中..." : "ログイン"}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={onChangeEmail}
                  className="text-xs text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
                >
                  メールを変更
                </button>
                <button
                  type="button"
                  onClick={onResend}
                  className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
                >
                  コードを再送
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={onSendCode} className="space-y-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="example@email.com"
                required
                disabled={status === "loading"}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 outline-none transition-colors focus:border-blue-400 focus:bg-white disabled:opacity-60"
              />

              {errorMessage && (
                <p className="text-xs leading-relaxed text-red-500" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                className="w-full rounded-2xl bg-blue-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-colors hover:bg-blue-600 disabled:bg-gray-300 disabled:shadow-none"
              >
                {status === "loading" ? "送信中..." : "確認コードを送る"}
              </button>

              <p className="text-center text-xs leading-relaxed text-gray-500">
                届いた6桁のコードを入力するだけ。
                <br />
                パスワードの設定は不要です。
              </p>
            </form>
          )}
        </div>

        {/* Value props — email step only */}
        {!isCodePhase && (
          <ul className="mt-8 space-y-3">
            {VALUE_POINTS.map((item) => (
              <li
                key={item.text}
                className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <span className="text-base leading-none" aria-hidden>
                  {item.icon}
                </span>
                <span className="leading-snug">{item.text}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-auto pt-8 text-center text-[11px] leading-relaxed text-gray-400">
          初回14日間、Plusと同じ機能を無料でお試しいただけます
          <br />
          {BRAND.audience}
        </p>
      </div>
    </div>
  );
}
