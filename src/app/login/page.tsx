"use client";

import { Suspense, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { BRAND } from "../../lib/brand";

type Status = "idle" | "loading" | "code_sent" | "verifying" | "error";

function toJapaneseError(message: string): string {
  if (/rate limit/i.test(message))
    return "メールの送信制限に達しました。しばらく時間をおいてから再試行してください。";
  if (/invalid.*email|email.*invalid/i.test(message))
    return "メールアドレスの形式が正しくありません。";
  if (/expired|invalid|token/i.test(message))
    return "コードが無効か期限切れです。再度メールアドレスを入力して送り直してください。";
  if (/already registered/i.test(message))
    return "このメールアドレスはすでに登録されています。";
  if (/network|fetch/i.test(message))
    return "通信エラーが発生しました。ネットワークを確認してください。";
  if (/confirmation email|sending.*email|email.*send/i.test(message))
    return "確認メールの送信に失敗しました。しばらく待ってから再試行するか、時間をおいてお試しください。";
  return "エラーが発生しました。しばらく時間をおいてから再試行してください。";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasAuthError = searchParams.get("error") === "auth_failed";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState(
    hasAuthError ? "認証に失敗しました。再度お試しください。" : ""
  );
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      setErrorMessage(toJapaneseError(error.message));
      setStatus("error");
    } else {
      setStatus("code_sent");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setStatus("verifying");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmedCode,
      type: "email",
    });

    if (error) {
      setErrorMessage(toJapaneseError(error.message));
      setStatus("code_sent");
    } else {
      router.replace("/");
    }
  };

  const handleResend = async () => {
    setCode("");
    setErrorMessage("");
    setStatus("loading");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      setErrorMessage(toJapaneseError(error.message));
      setStatus("error");
    } else {
      setStatus("code_sent");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👶</div>
          <h1 className="text-xl font-bold text-gray-800">{BRAND.name}</h1>
          <p className="text-xs text-gray-500 mt-1">{BRAND.subtitle}</p>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            {BRAND.tagline}
            <br />
            <span className="text-gray-500">{BRAND.subtagline}</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">{BRAND.audience}</p>
          <p className="text-sm text-gray-500 mt-3">
            {status === "code_sent" || status === "verifying"
              ? "確認コードを入力"
              : "メールアドレスでログイン"}
          </p>
        </div>

        {status === "code_sent" || status === "verifying" ? (
          /* コード入力フォーム */
          <form
            onSubmit={handleVerifyCode}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8"
          >
            <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed">
              <span className="font-medium text-gray-800">{email}</span> に
              <br />
              6桁の確認コードを送りました
            </p>

            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              disabled={status === "verifying"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-400 disabled:bg-gray-50 mb-4 text-center text-xl tracking-widest"
            />

            {errorMessage && (
              <p className="text-xs text-red-500 mb-3 text-center">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "verifying" || code.length < 6}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              {status === "verifying" ? "確認中..." : "ログイン"}
            </button>

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => { setStatus("idle"); setCode(""); setErrorMessage(""); }}
                className="text-xs text-gray-400 underline"
              >
                メールアドレスを変更
              </button>
              <button
                type="button"
                onClick={handleResend}
                className="text-xs text-blue-500 underline"
              >
                コードを再送する
              </button>
            </div>
          </form>
        ) : (
          /* メール入力フォーム */
          <form
            onSubmit={handleSendCode}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8"
          >
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={status === "loading"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-blue-400 disabled:bg-gray-50 mb-4"
            />

            {errorMessage && (
              <p className="text-xs text-red-500 mb-3">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              {status === "loading" ? "送信中..." : "確認コードを送る"}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
              メールアドレスに6桁の確認コードを送ります。
              <br />
              パスワードは不要です。
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
