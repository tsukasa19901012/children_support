"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { formatAge } from "../../lib/childAge";

type Step = "name" | "birthday" | "gender";
type Gender = "male" | "female" | "other";

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male",   label: "男の子", emoji: "👦" },
  { value: "female", label: "女の子", emoji: "👧" },
  { value: "other",  label: "答えない", emoji: "🌟" },
];

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_DAY = NOW.getDate();
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function clampDay(year: number, month: number, day: number) {
  return Math.min(day, daysInMonth(year, month));
}
function isFutureDate(year: number, month: number, day: number) {
  if (year > CURRENT_YEAR) return true;
  if (year === CURRENT_YEAR && month > CURRENT_MONTH) return true;
  if (year === CURRENT_YEAR && month === CURRENT_MONTH && day > CURRENT_DAY) return true;
  return false;
}

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode"); // "edit" | "add" | null（初回）
  const childId = searchParams.get("childId");
  const isEdit = mode === "edit" && !!childId;
  const isAdd = mode === "add";

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [year, setYear] = useState<number>(CURRENT_YEAR - 3);
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  // 編集モード：既存データを読み込む
  useEffect(() => {
    if (!isEdit) return;
    const supabase = createClient();
    supabase
      .from("children")
      .select("name, birthday, gender")
      .eq("id", childId!)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name);
        const [y, m, d] = data.birthday.split("-").map(Number);
        setYear(y); setMonth(m); setDay(d);
        setGender(data.gender as Gender ?? null);
        setLoading(false);
      });
  }, [isEdit, childId]);

  const days = useMemo(() => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1), [year, month]);
  const safeDay = clampDay(year, month, day);
  const birthday = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  const isFuture = isFutureDate(year, month, safeDay);
  const agePreview = isFuture ? "未来の日付です" : formatAge(birthday);

  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep("birthday");
  };

  const handleBirthdayNext = () => setStep("gender");

  const handleGenderSelect = async (selected: Gender) => {
    setGender(selected);
    await save(selected);
  };

  const save = async (selectedGender: Gender) => {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    if (isEdit) {
      // 既存子どもを更新
      const { error: err } = await supabase
        .from("children")
        .update({ name: name.trim(), birthday, gender: selectedGender, updated_at: new Date().toISOString() })
        .eq("id", childId!);
      if (err) { setError("保存に失敗しました。"); setSaving(false); return; }
      router.replace("/account");
    } else {
      // 新規追加（初回 or Proの追加）
      const { data: child, error: err } = await supabase
        .from("children")
        .insert({ user_id: user.id, name: name.trim(), birthday, gender: selectedGender })
        .select("id")
        .single();
      if (err || !child) { setError("保存に失敗しました。"); setSaving(false); return; }

      // 初回 or 追加 → アクティブ子どもに設定
      await supabase.from("users").update({ active_child_id: child.id }).eq("id", user.id);
      router.replace(isAdd ? "/account" : "/");
    }
  };

  const steps: Step[] = ["name", "birthday", "gender"];
  const stepIndex = steps.indexOf(step);

  const title = isEdit ? "子ども情報を編集" : isAdd ? "子どもを追加" : "はじめまして";
  const subtitle = isEdit ? "情報を更新してください" : isAdd ? "お子さんのことを教えてください" : "お子さんのことを教えてください";
  const backPath = (isEdit || isAdd) ? "/account" : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6 py-10">
      <div className="w-full max-w-sm">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👶</div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? "w-8 bg-blue-500" : i < stepIndex ? "w-4 bg-blue-300" : "w-4 bg-gray-200"
            }`} />
          ))}
        </div>

        {/* Step 1: 名前 */}
        {step === "name" && (
          <form onSubmit={handleNameNext} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">お子さんのお名前は？</p>
            <p className="text-xs text-gray-400 mb-5">ニックネームでも大丈夫です</p>
            <input
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：たろう" maxLength={20} autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 mb-5"
            />
            <button type="submit" disabled={!name.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
              次へ
            </button>
            {backPath && (
              <button type="button" onClick={() => router.replace(backPath)}
                className="w-full text-xs text-gray-400 underline mt-3">キャンセル</button>
            )}
          </form>
        )}

        {/* Step 2: 誕生日 */}
        {step === "birthday" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">{name}ちゃんの誕生日は？</p>
            <p className="text-xs text-gray-400 mb-5">年齢は自動で計算されます</p>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1 text-center">年</label>
                <select value={year} onChange={(e) => { const y = Number(e.target.value); setYear(y); setDay(clampDay(y, month, day)); }}
                  className="w-full border border-gray-300 rounded-xl px-2 py-3 text-sm outline-none focus:border-blue-400 text-center">
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="w-16">
                <label className="text-xs text-gray-400 block mb-1 text-center">月</label>
                <select value={month} onChange={(e) => { const m = Number(e.target.value); setMonth(m); setDay(clampDay(year, m, day)); }}
                  className="w-full border border-gray-300 rounded-xl px-1 py-3 text-sm outline-none focus:border-blue-400 text-center">
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="w-16">
                <label className="text-xs text-gray-400 block mb-1 text-center">日</label>
                <select value={safeDay} onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-1 py-3 text-sm outline-none focus:border-blue-400 text-center">
                  {days.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className={`rounded-xl px-4 py-3 text-center mb-5 ${isFuture ? "bg-red-50" : "bg-blue-50"}`}>
              <p className={`text-xs mb-0.5 ${isFuture ? "text-red-400" : "text-blue-400"}`}>現在の年齢</p>
              <p className={`text-lg font-bold ${isFuture ? "text-red-500" : "text-blue-600"}`}>{agePreview}</p>
            </div>
            <button type="button" onClick={handleBirthdayNext} disabled={isFuture}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
              次へ
            </button>
            <button type="button" onClick={() => setStep("name")}
              className="w-full text-xs text-gray-400 underline mt-3">戻る</button>
          </div>
        )}

        {/* Step 3: 性別 */}
        {step === "gender" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">{name}ちゃんの性別は？</p>
            <p className="text-xs text-gray-400 mb-5">任意です。答えなくても大丈夫です</p>
            <div className="flex flex-col gap-3 mb-4">
              {GENDER_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" disabled={saving}
                  onClick={() => handleGenderSelect(opt.value)}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-blue-50 active:bg-blue-100 border border-gray-200 hover:border-blue-300 rounded-2xl px-5 py-4 transition-colors disabled:opacity-50">
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
            <button type="button" onClick={() => setStep("birthday")} disabled={saving}
              className="w-full text-xs text-gray-400 underline mt-2">戻る</button>
          </div>
        )}

        {saving && <p className="text-center text-sm text-gray-400 mt-6">保存中...</p>}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
