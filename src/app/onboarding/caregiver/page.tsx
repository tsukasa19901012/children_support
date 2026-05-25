"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccountReturn } from "../../../features/account/hooks/useAccountReturn";
import { createClient } from "../../../lib/supabase-browser";
import {
  caregiverBirthYearOptions,
  formatAge,
} from "../../../lib/childAge";
import { hasPlusAccess } from "../../../features/billing/planAccess";
import { BrandMark } from "../../../features/auth/components/BrandMark";
import { ensurePublicUserRow } from "../../../features/auth/ensurePublicUserRow";
import {
  fetchGuardianChildIds,
  saveGuardianRelations,
} from "../../../features/child/lib/guardianRelations";
import { PROFILE_TYPE_CAREGIVER } from "../../../features/child/types/profileType";

type Step = "name" | "birthday" | "gender" | "children";
type Gender = "male" | "female" | "other";

type ChildOption = {
  id: string;
  name: string;
};

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male", label: "男性", emoji: "👨" },
  { value: "female", label: "女性", emoji: "👩" },
  { value: "other", label: "答えない", emoji: "🌟" },
];

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_DAY = NOW.getDate();
const YEARS = caregiverBirthYearOptions(NOW);
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
  if (year === CURRENT_YEAR && month === CURRENT_MONTH && day > CURRENT_DAY)
    return true;
  return false;
}

function CaregiverOnboardingForm() {
  const router = useRouter();
  const returnToAccount = useAccountReturn();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const caregiverIdParam = searchParams.get("caregiverId");
  const isEdit = mode === "edit" && !!caregiverIdParam;
  const isAdd = mode === "add";

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [year, setYear] = useState<number>(CURRENT_YEAR - 35);
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [hasBirthday, setHasBirthday] = useState(false);
  const [gender, setGender] = useState<Gender | null>(null);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [childOptions, setChildOptions] = useState<ChildOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit || isAdd);
  const [error, setError] = useState("");
  const [hasPlus, setHasPlus] = useState(false);
  const [caregiverId, setCaregiverId] = useState<string | null>(
    isEdit ? caregiverIdParam : null
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: userRow } = await supabase
        .from("users")
        .select("plan, created_at, trial_ends_at")
        .eq("id", user.id)
        .single();
      setHasPlus(
        hasPlusAccess({
          plan: userRow?.plan ?? "free",
          created_at: userRow?.created_at ?? new Date().toISOString(),
          trial_ends_at: userRow?.trial_ends_at ?? null,
        })
      );

      const { data: children } = await supabase
        .from("children")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("profile_type", "child")
        .order("created_at");

      setChildOptions((children ?? []) as ChildOption[]);

      if (isEdit && caregiverIdParam) {
        const { data: profile } = await supabase
          .from("children")
          .select("name, birthday, gender")
          .eq("id", caregiverIdParam)
          .eq("profile_type", PROFILE_TYPE_CAREGIVER)
          .single();

        if (profile) {
          setName(profile.name);
          setGender(profile.gender as Gender | null);
          if (profile.birthday) {
            setHasBirthday(true);
            const [y, m, d] = profile.birthday.split("-").map(Number);
            setYear(y);
            setMonth(m);
            setDay(d);
          }
        }

        const linked = await fetchGuardianChildIds(
          supabase,
          user.id,
          caregiverIdParam
        );
        setSelectedChildIds(linked);
      }

      setLoading(false);
    });
  }, [isEdit, caregiverIdParam]);

  const days = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month]
  );
  const safeDay = clampDay(year, month, day);
  const birthday = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  const isFuture = hasBirthday && isFutureDate(year, month, safeDay);
  const agePreview = !hasBirthday
    ? "未登録（任意）"
    : isFuture
      ? "未来の日付です"
      : (formatAge(birthday) ?? "—");

  const finishRedirect = () => returnToAccount(true);

  const persistCaregiver = async (
    selectedGender: Gender | null,
    childIds: string[]
  ) => {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: userRowError } = await ensurePublicUserRow(supabase, user.id);
    if (userRowError) {
      setError("アカウントの初期化に失敗しました。");
      setSaving(false);
      return;
    }

    const payload = {
      name: name.trim(),
      birthday: hasBirthday && !isFuture ? birthday : null,
      gender: selectedGender,
      profile_type: PROFILE_TYPE_CAREGIVER,
      updated_at: new Date().toISOString(),
    };

    let targetId = caregiverId;

    if (isEdit && caregiverId) {
      const { error: err } = await supabase
        .from("children")
        .update(payload)
        .eq("id", caregiverId);
      if (err) {
        setError(err.message.includes("Plus")
          ? "保護者プロフィールの登録にはPlusプランが必要です。"
          : "保存に失敗しました。");
        setSaving(false);
        return;
      }
    } else {
      const { data: created, error: err } = await supabase
        .from("children")
        .insert({ ...payload, user_id: user.id })
        .select("id")
        .single();
      if (err || !created) {
        setError(
          err?.message?.includes("1人まで")
            ? "保護者プロフィールは1人まで登録できます。"
            : err?.message?.includes("Plus")
              ? "保護者プロフィールの登録にはPlusプランが必要です。"
              : "保存に失敗しました。"
        );
        setSaving(false);
        return;
      }
      targetId = created.id;
      setCaregiverId(created.id);
    }

    if (!targetId) {
      setSaving(false);
      return;
    }

    const { error: relErr } = await saveGuardianRelations(
      supabase,
      user.id,
      targetId,
      childIds
    );
    if (relErr) {
      setError("保護者の対象の保存に失敗しました。");
      setSaving(false);
      return;
    }

    setSaving(false);
    finishRedirect();
  };

  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep("birthday");
  };

  const toggleChild = (id: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const steps: Step[] = ["name", "birthday", "gender", "children"];
  const stepIndex = steps.indexOf(step);

  const title = isEdit
    ? "保護者（自分）の情報を編集"
    : "保護者（自分）を登録";
  const subtitle = isEdit
    ? "自分自身の相談プロフィールを更新します"
    : "自分の気持ちや疲れについて相談できます";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (!hasPlus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6">
        <p className="text-sm text-gray-500 mb-4 text-center leading-relaxed">
          保護者（自分）の相談は、Plusプランまたは体験期間中のみご利用いただけます。
        </p>
        <button
          type="button"
          onClick={() => returnToAccount(false)}
          className="text-sm text-blue-500 underline"
        >
          マイページへ戻る
        </button>
      </div>
    );
  }

  if (childOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6">
        <p className="text-sm text-gray-500 mb-4 text-center leading-relaxed">
          先にお子さんを1人登録してから、保護者プロフィールを追加してください。
        </p>
        <button
          type="button"
          onClick={() => returnToAccount(false)}
          className="text-sm text-blue-500 underline"
        >
          マイページへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center">
            <BrandMark size="xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-emerald-500"
                  : i < stepIndex
                    ? "w-4 bg-emerald-300"
                    : "w-4 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === "name" && (
          <form
            onSubmit={handleNameNext}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8"
          >
            <p className="text-base font-semibold text-gray-800 mb-1">
              お名前は？
            </p>
            <p className="text-xs text-gray-400 mb-5">ニックネームでも大丈夫です</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：ママ、パパ"
              maxLength={20}
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 mb-5"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              次へ
            </button>
            <button
              type="button"
              onClick={() => returnToAccount(false)}
              className="w-full text-xs text-gray-400 underline mt-3"
            >
              キャンセル
            </button>
          </form>
        )}

        {step === "birthday" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">
              誕生日は？（任意）
            </p>
            <p className="text-xs text-gray-400 mb-5">
              登録しなくても相談できます
            </p>
            <label className="flex items-center gap-2 mb-4 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={hasBirthday}
                onChange={(e) => setHasBirthday(e.target.checked)}
                className="rounded border-gray-300"
              />
              誕生日を登録する
            </label>
            {hasBirthday && (
              <div className="flex gap-2 mb-4">
                <select
                  value={year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setYear(y);
                    setDay(clampDay(y, month, day));
                  }}
                  className="flex-1 border border-gray-300 rounded-xl px-2 py-3 text-sm text-center"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={month}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setMonth(m);
                    setDay(clampDay(year, m, day));
                  }}
                  className="w-16 border border-gray-300 rounded-xl px-1 py-3 text-sm text-center"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={safeDay}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-16 border border-gray-300 rounded-xl px-1 py-3 text-sm text-center"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="rounded-xl px-4 py-3 text-center mb-5 bg-emerald-50">
              <p className="text-xs text-emerald-600 mb-0.5">表示</p>
              <p className="text-lg font-bold text-emerald-700">{agePreview}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep("gender")}
              disabled={hasBirthday && isFuture}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              次へ
            </button>
            <button
              type="button"
              onClick={() => setStep("name")}
              className="w-full text-xs text-gray-400 underline mt-3"
            >
              戻る
            </button>
          </div>
        )}

        {step === "gender" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">
              性別は？（任意）
            </p>
            <div className="flex flex-col gap-3 mb-4">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setGender(opt.value);
                    setStep("children");
                  }}
                  className="flex items-center gap-4 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-2xl px-5 py-4 transition-colors disabled:opacity-50"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setGender(null);
                setStep("children");
              }}
              className="w-full text-sm text-gray-500 underline"
            >
              スキップ（答えない）
            </button>
            <button
              type="button"
              onClick={() => setStep("birthday")}
              className="w-full text-xs text-gray-400 underline mt-3"
            >
              戻る
            </button>
          </div>
        )}

        {step === "children" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">
              誰の保護者ですか？
            </p>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              複数選べます。選んだお子さんの情報を踏まえて相談に答えます。
            </p>
            <div className="space-y-2 mb-5">
              {childOptions.map((child) => {
                const checked = selectedChildIds.includes(child.id);
                return (
                  <label
                    key={child.id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                      checked
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChild(child.id)}
                      className="rounded border-gray-300 text-emerald-600"
                    />
                    <span className="text-sm font-medium text-gray-800">
                      {child.name}ちゃん
                    </span>
                  </label>
                );
              })}
            </div>
            {error && (
              <p className="text-xs text-red-500 text-center mb-3">{error}</p>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => void persistCaregiver(gender, selectedChildIds)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              {saving ? "保存中..." : isEdit ? "保存する" : "登録を完了"}
            </button>
            <button
              type="button"
              onClick={() => setStep("gender")}
              disabled={saving}
              className="w-full text-xs text-gray-400 underline mt-3"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CaregiverOnboardingPage() {
  return (
    <Suspense>
      <CaregiverOnboardingForm />
    </Suspense>
  );
}
