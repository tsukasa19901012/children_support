"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

type Step = "name" | "age" | "gender";
type Gender = "male" | "female" | "other";

const AGE_OPTIONS = [2, 3, 4, 5, 6];
const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male",   label: "男の子", emoji: "👦" },
  { value: "female", label: "女の子", emoji: "👧" },
  { value: "other",  label: "答えない", emoji: "🌟" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep("age");
  };

  const handleAgeSelect = (selected: number) => {
    setAge(selected);
    setStep("gender");
  };

  const handleGenderSelect = async (selected: Gender) => {
    setGender(selected);
    await save(selected);
  };

  const save = async (selectedGender: Gender) => {
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: err } = await supabase.from("children").upsert({
      user_id: user.id,
      name: name.trim(),
      age: age!,
      gender: selectedGender,
    }, { onConflict: "user_id" });

    if (err) {
      setError("保存に失敗しました。もう一度お試しください。");
      setSaving(false);
      return;
    }

    router.replace("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6 py-10">
      <div className="w-full max-w-sm">

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👶</div>
          <h1 className="text-xl font-bold text-gray-800">はじめまして</h1>
          <p className="text-sm text-gray-500 mt-1">お子さんのことを教えてください</p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex justify-center gap-2 mb-8">
          {(["name", "age", "gender"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-8 bg-blue-500" :
                i < ["name","age","gender"].indexOf(step) ? "w-4 bg-blue-300" :
                "w-4 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: 名前 */}
        {step === "name" && (
          <form onSubmit={handleNameNext} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">お子さんのお名前は？</p>
            <p className="text-xs text-gray-400 mb-5">ニックネームでも大丈夫です</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：たろうくん"
              maxLength={20}
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 mb-5"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              次へ
            </button>
          </form>
        )}

        {/* Step 2: 年齢 */}
        {step === "age" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">
              {name}ちゃん（くん）は何歳？
            </p>
            <p className="text-xs text-gray-400 mb-5">タップで選んでください</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {AGE_OPTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleAgeSelect(a)}
                  className="flex flex-col items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 border border-gray-200 hover:border-blue-300 rounded-2xl py-4 transition-colors"
                >
                  <span className="text-2xl font-bold text-gray-800">{a}</span>
                  <span className="text-xs text-gray-500 mt-0.5">歳</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep("name")}
              className="w-full text-xs text-gray-400 underline mt-2"
            >
              戻る
            </button>
          </div>
        )}

        {/* Step 3: 性別 */}
        {step === "gender" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">
              {name}ちゃん（くん）の性別は？
            </p>
            <p className="text-xs text-gray-400 mb-5">任意です。答えなくても大丈夫です</p>
            <div className="flex flex-col gap-3 mb-4">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => handleGenderSelect(opt.value)}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-blue-50 active:bg-blue-100 border border-gray-200 hover:border-blue-300 rounded-2xl px-5 py-4 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
            <button
              type="button"
              onClick={() => setStep("age")}
              disabled={saving}
              className="w-full text-xs text-gray-400 underline mt-2"
            >
              戻る
            </button>
          </div>
        )}

        {saving && (
          <p className="text-center text-sm text-gray-400 mt-6">保存中...</p>
        )}
      </div>
    </div>
  );
}
