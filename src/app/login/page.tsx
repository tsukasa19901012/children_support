"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

type Status = "idle" | "loading" | "sent" | "error";

function toJapaneseError(message: string): string {
  if (/rate limit/i.test(message))
    return "メールの送信制限に達しました。しばらく時間をおいてから再試行してください。";
  if (/invalid.*email|email.*invalid/i.test(message))
    return "メールアドレスの形式が正しくありません。";
  if (/expired|invalid.*link|link.*invalid/i.test(message))
    return "リンクが無効か期限切れです。再度メールアドレスを入力して送り直してください。";
  if (/already registered/i.test(message))
    return "このメールアドレスはすでに登録されています。";
  if (/network|fetch/i.test(message))
    return "通信エラーが発生しました。ネットワークを確認してください。";
  return "エラーが発生しました。しばらく時間をおいてから再試行してください。";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const hasAuthError = searchParams.get("error") === "auth_failed";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState(
    hasAuthError
      ? "リンクが無効か期限切れです。再度メールアドレスを入力して送り直してください。"
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(toJapaneseError(error.message));
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👶</div>
          <h1 className="text-xl font-bold text-gray-800">育児AIチャット</h1>
          <p className="text-sm text-gray-500 mt-1">メールアドレスでログイン</p>
        </div>

        {status === "sent" ? (
          /* 送信完了 */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8 text-center">
            <div className="text-4xl mb-3">📩</div>
            <p className="font-medium text-gray-800 mb-2">メールを送信しました</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700">{email}</span>{" "}
              宛にログインリンクを送りました。
              <br />
              メールを確認してリンクをタップしてください。
            </p>
            <button
              type="button"
              onClick={() => { setStatus("idle"); setEmail(""); }}
              className="mt-6 text-sm text-blue-500 underline"
            >
              別のメールアドレスで試す
            </button>
          </div>
        ) : (
          /* ログインフォーム */
          <form
            onSubmit={handleSubmit}
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
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 disabled:bg-gray-50 mb-4"
            />

            {/* URL パラメータ or 送信エラー */}
            {errorMessage && (
              <p className="text-xs text-red-500 mb-3">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              {status === "loading" ? "送信中..." : "ログインリンクを送る"}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
              メールアドレスにログイン用のリンクを送ります。
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
