"use client";

import { Suspense, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { LoginScreen } from "../../features/auth/components/LoginScreen";

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

  const phase =
    status === "code_sent" || status === "verifying" ? "code" : "email";

  return (
    <LoginScreen
      phase={phase}
      email={email}
      code={code}
      status={status}
      errorMessage={errorMessage}
      codeInputRef={codeInputRef}
      onEmailChange={setEmail}
      onCodeChange={setCode}
      onSendCode={handleSendCode}
      onVerifyCode={handleVerifyCode}
      onResend={handleResend}
      onChangeEmail={() => {
        setStatus("idle");
        setCode("");
        setErrorMessage("");
      }}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
