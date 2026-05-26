"use client";

import { useState, type FormEvent } from "react";
import type { ContactCategory } from "../types";

const CATEGORIES: { value: ContactCategory; label: string }[] = [
  { value: "billing", label: "課金・解約・返金" },
  { value: "account", label: "ログイン・アカウント" },
  { value: "privacy", label: "個人情報の開示・削除" },
  { value: "bug", label: "不具合・障害" },
  { value: "other", label: "その他" },
];

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<ContactCategory>("other");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category, message, website }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setErrorMessage(data.error ?? "送信に失敗しました。");
        setStatus("error");
        return;
      }

      setStatus("success");
      setMessage("");
      setWebsite("");
    } catch {
      setErrorMessage("通信エラーが発生しました。しばらくしてからお試しください。");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-6 text-center text-sm text-green-800 leading-relaxed">
        お問い合わせを受け付けました。
        <br />
        通常3営業日以内に、ご入力のメールアドレスへ返信します。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-gray-800 mb-1">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400"
          placeholder="返信先のメールアドレス"
        />
      </div>

      <div>
        <label htmlFor="contact-category" className="block text-sm font-medium text-gray-800 mb-1">
          お問い合わせ種別
        </label>
        <select
          id="contact-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ContactCategory)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-gray-800 mb-1">
          内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 resize-y"
          placeholder="できるだけ具体的にご記入ください"
        />
        <p className="text-[11px] text-gray-400 mt-1 text-right">{message.length}/2000</p>
      </div>

      <div className="hidden" aria-hidden>
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 text-center">{errorMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading" || !message.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium py-3 rounded-xl transition-colors"
      >
        {status === "loading" ? "送信中..." : "送信する"}
      </button>

      <p className="text-[11px] text-gray-400 leading-relaxed text-center">
        緊急の医療相談・危機対応は、当サービスでは対応できません。お近くの医療機関等へご相談ください。
      </p>
    </form>
  );
}
