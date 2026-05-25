"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccountReturn } from "../../features/account/hooks/useAccountReturn";
import { createClient } from "../../lib/supabase-browser";
import {
  birthYearOptions,
  formatAge,
  isChildAgeInRecommendedRange,
  RECOMMENDED_MAX_CHILD_AGE_YEARS,
} from "../../lib/childAge";
import { hasPlusAccess } from "../../features/billing/planAccess";
import { SiblingRelationsForm } from "../../features/child/components/SiblingRelationsForm";
import {
  peerLinksFromForm,
  saveChildSiblingRelations,
} from "../../features/child/lib/siblingRelations";
import { BRAND } from "../../lib/brand";
import { BrandMark } from "../../features/auth/components/BrandMark";
import { ensurePublicUserRow } from "../../features/auth/ensurePublicUserRow";
import {
  RELATION_NONE,
  storedRelationToKind,
  type ChildPeerRelation,
  type PeerRelationFormValue,
} from "../../features/child/types/siblingRelation";

type Step = "name" | "birthday" | "gender" | "siblings";
type Gender = "male" | "female" | "other";

type ExistingChild = {
  id: string;
  name: string;
  birthday: string;
  gender: Gender | null;
  profile_type?: string;
};

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male", label: "男の子", emoji: "👦" },
  { value: "female", label: "女の子", emoji: "👧" },
  { value: "other", label: "答えない", emoji: "🌟" },
];

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth() + 1;
const CURRENT_DAY = NOW.getDate();
const YEARS = birthYearOptions(NOW);
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

function OnboardingForm() {
  const router = useRouter();
  const returnToAccount = useAccountReturn();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const childIdParam = searchParams.get("childId");
  const isEdit = mode === "edit" && !!childIdParam;
  const isAdd = mode === "add";
  const isSiblingsOnly = mode === "siblings" && !!childIdParam;

  const [step, setStep] = useState<Step>(isSiblingsOnly ? "siblings" : "name");
  const [name, setName] = useState("");
  const [year, setYear] = useState<number>(CURRENT_YEAR - 3);
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit || isSiblingsOnly || isAdd);
  const [error, setError] = useState("");

  const [hasPlus, setHasPlus] = useState(false);
  const [existingChildren, setExistingChildren] = useState<ExistingChild[]>([]);
  const [newChildId, setNewChildId] = useState<string | null>(
    isSiblingsOnly ? childIdParam : null
  );
  const [initialRelations, setInitialRelations] = useState<
    Record<string, PeerRelationFormValue>
  >({});

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
        .select("id, name, birthday, gender, profile_type")
        .eq("user_id", user.id)
        .order("created_at");

      const list = (children ?? []).filter(
        (c) => c.profile_type !== "caregiver"
      ) as ExistingChild[];
      setExistingChildren(list);

      if (isSiblingsOnly && childIdParam) {
        const target = list.find((c) => c.id === childIdParam);
        if (target) {
          setName(target.name);
          setGender(target.gender);
        }

        const { data: rels } = await supabase
          .from("child_sibling_relations")
          .select("sibling_id, relation")
          .eq("child_id", childIdParam)
          .eq("user_id", user.id);

        const init: Record<string, PeerRelationFormValue> = {};
        for (const r of rels ?? []) {
          if (r.relation === "guardian") continue;
          init[r.sibling_id] = storedRelationToKind(
            r.relation as ChildPeerRelation
          );
        }
        setInitialRelations(init);
        setLoading(false);
      } else if (!isEdit) {
        setLoading(false);
      }
    });
  }, [isSiblingsOnly, isEdit, isAdd, childIdParam]);

  useEffect(() => {
    if (!isEdit) return;
    const supabase = createClient();
    supabase
      .from("children")
      .select("name, birthday, gender")
      .eq("id", childIdParam!)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("データの読み込みに失敗しました。");
          setLoading(false);
          return;
        }
        setName(data.name);
        const [y, m, d] = data.birthday.split("-").map(Number);
        setYear(y);
        setMonth(m);
        setDay(d);
        setGender(data.gender as Gender ?? null);
        setLoading(false);
      });
  }, [isEdit, childIdParam]);

  const days = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month]
  );
  const safeDay = clampDay(year, month, day);
  const birthday = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  const isFuture = isFutureDate(year, month, safeDay);
  const isOutsideRecommended =
    !isFuture && !isChildAgeInRecommendedRange(birthday);
  const agePreview = isFuture ? "未来の日付です" : (formatAge(birthday) ?? "—");

  const siblingTargets = useMemo(() => {
    const targetId = newChildId ?? childIdParam;
    return existingChildren.filter((c) => c.id !== targetId);
  }, [existingChildren, newChildId, childIdParam]);

  const needsSiblingStep =
    hasPlus && siblingTargets.length > 0 && (isAdd || isSiblingsOnly);

  const handleNameNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep("birthday");
  };

  const handleBirthdayNext = () => setStep("gender");

  const finishRedirect = () => {
    if (isAdd || isSiblingsOnly) returnToAccount(true);
    else {
      router.replace("/");
    }
  };

  const saveSiblingRelations = async (
    targetChildId: string,
    targetGender: Gender,
    relations: Record<string, PeerRelationFormValue>
  ) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const targetChild = existingChildren.find((c) => c.id === targetChildId);
    const childBirthday = targetChild?.birthday ?? birthday;
    const peerProfiles = Object.fromEntries(
      existingChildren
        .filter((c) => c.id !== targetChildId)
        .map((c) => [c.id, { birthday: c.birthday, gender: c.gender }])
    );

    const links = peerLinksFromForm(relations, childBirthday, peerProfiles);

    const { error: saveErr } = await saveChildSiblingRelations(
      supabase,
      user.id,
      targetChildId,
      targetGender,
      links
    );

    if (saveErr) {
      setError("関係の保存に失敗しました。");
      setSaving(false);
      return;
    }
    finishRedirect();
  };

  const handleGenderSelect = async (selected: Gender) => {
    if (isFuture) {
      setError("未来の日付は設定できません。");
      return;
    }
    if (!name.trim()) {
      setError("名前を入力してください。");
      return;
    }

    setGender(selected);
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
      setError("アカウントの初期化に失敗しました。再度ログインしてください。");
      setSaving(false);
      return;
    }

    if (isEdit) {
      const { error: err } = await supabase
        .from("children")
        .update({
          name: name.trim(),
          birthday,
          gender: selected,
          updated_at: new Date().toISOString(),
        })
        .eq("id", childIdParam!);
      setSaving(false);
      if (err) {
        setError("保存に失敗しました。");
        return;
      }
      returnToAccount(true);
      return;
    }

    const { data: child, error: err } = await supabase
      .from("children")
      .insert({
        user_id: user.id,
        name: name.trim(),
        birthday,
        gender: selected,
        profile_type: "child",
      })
      .select("id")
      .single();

    if (err || !child) {
      console.error("[onboarding] 子ども登録失敗:", err?.message);
      if (err?.message?.includes("Plusプランへのアップグレード")) {
        setError(
          "複数の子どもを登録するにはPlusプランへのアップグレードが必要です。"
        );
      } else {
        setError(`保存に失敗しました。${err?.message ?? ""}`);
      }
      setSaving(false);
      return;
    }

    await supabase
      .from("users")
      .update({ active_child_id: child.id })
      .eq("id", user.id);

    const others = existingChildren;
    if (hasPlus && others.length > 0) {
      const init: Record<string, PeerRelationFormValue> = {};
      for (const s of others) {
        init[s.id] = others.length === 1 ? "sibling" : RELATION_NONE;
      }
      setInitialRelations(init);
      setNewChildId(child.id);
      setSaving(false);
      setStep("siblings");
      return;
    }

    setSaving(false);
    finishRedirect();
  };

  const steps: Step[] = needsSiblingStep || isSiblingsOnly
    ? ["name", "birthday", "gender", "siblings"]
    : ["name", "birthday", "gender"];
  const stepIndex = steps.indexOf(step);

  const title = isSiblingsOnly
    ? "まわりのお子さんとの関係"
    : isEdit
      ? "お子さんの情報を編集"
      : isAdd
        ? "お子さんを追加"
        : `${BRAND.name}へようこそ`;
  const subtitle = isSiblingsOnly
    ? "きょうだい・園の友達など。年上・年下は誕生日から自動で判断します"
    : isEdit
      ? "内容を更新してください"
      : isAdd
        ? "相談するお子さんを登録します"
        : `${BRAND.audience}。まずは相談するお子さんから`;
  const backPath = isEdit || isAdd || isSiblingsOnly ? "/account" : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  if (
    !loading &&
    !hasPlus &&
    (isSiblingsOnly || (isAdd && existingChildren.length >= 1))
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6">
        <p className="text-sm text-gray-500 mb-4 text-center leading-relaxed">
          複数のお子さんの登録と関係の設定は、Plusプランまたは体験期間中のみご利用いただけます。
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

  if (isSiblingsOnly && siblingTargets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-gray-50 px-6">
        <p className="text-sm text-gray-500 mb-4 text-center">
          きょうだいを登録するには、お子さんを2人以上追加してください。
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

        {!isSiblingsOnly && (
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-8 bg-blue-500"
                    : i < stepIndex
                      ? "w-4 bg-blue-300"
                      : "w-4 bg-gray-200"
                }`}
              />
            ))}
          </div>
        )}

        {step === "name" && !isSiblingsOnly && (
          <form
            onSubmit={handleNameNext}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8"
          >
            <p className="text-base font-semibold text-gray-800 mb-1">
              お子さんのお名前は？
            </p>
            <p className="text-xs text-gray-400 mb-5">
              ニックネームでも大丈夫です
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：たろう"
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
            {backPath && (
              <button
                type="button"
                onClick={() => returnToAccount(false)}
                className="w-full text-xs text-gray-400 underline mt-3"
              >
                キャンセル
              </button>
            )}
          </form>
        )}

        {step === "birthday" && !isSiblingsOnly && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">
              {name}ちゃんの誕生日は？
            </p>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed">
              0〜{RECOMMENDED_MAX_CHILD_AGE_YEARS}歳向けに最適化しています。7歳以上のお子さんもご利用いただけます。
            </p>
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1 text-center">
                  年
                </label>
                <select
                  value={year}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setYear(y);
                    setDay(clampDay(y, month, day));
                  }}
                  className="w-full border border-gray-300 rounded-xl px-2 py-3 text-sm outline-none focus:border-blue-400 text-center"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-16">
                <label className="text-xs text-gray-400 block mb-1 text-center">
                  月
                </label>
                <select
                  value={month}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setMonth(m);
                    setDay(clampDay(year, m, day));
                  }}
                  className="w-full border border-gray-300 rounded-xl px-1 py-3 text-sm outline-none focus:border-blue-400 text-center"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-16">
                <label className="text-xs text-gray-400 block mb-1 text-center">
                  日
                </label>
                <select
                  value={safeDay}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl px-1 py-3 text-sm outline-none focus:border-blue-400 text-center"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              className={`rounded-xl px-4 py-3 text-center mb-3 ${isFuture ? "bg-red-50" : isOutsideRecommended ? "bg-amber-50" : "bg-blue-50"}`}
            >
              <p
                className={`text-xs mb-0.5 ${isFuture ? "text-red-400" : isOutsideRecommended ? "text-amber-600" : "text-blue-400"}`}
              >
                現在の年齢
              </p>
              <p
                className={`text-lg font-bold ${isFuture ? "text-red-500" : isOutsideRecommended ? "text-amber-700" : "text-blue-600"}`}
              >
                {agePreview}
              </p>
            </div>
            {isOutsideRecommended && (
              <p className="text-xs text-amber-700 mb-5 leading-relaxed">
                0〜{RECOMMENDED_MAX_CHILD_AGE_YEARS}歳向けの内容です。7歳以上でもご利用いただけますが、発達段階に合わない場合があります。
              </p>
            )}
            {!isOutsideRecommended && <div className="mb-5" />}
            <button
              type="button"
              onClick={handleBirthdayNext}
              disabled={isFuture}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
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

        {step === "gender" && !isSiblingsOnly && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
            <p className="text-base font-semibold text-gray-800 mb-1">
              {name}ちゃんの性別は？
            </p>
            <p className="text-xs text-gray-400 mb-5">
              任意です。答えなくても大丈夫です
            </p>
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
                  <span className="text-sm font-medium text-gray-700">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            {error && (
              <p className="text-xs text-red-500 text-center mb-3">{error}</p>
            )}
            <button
              type="button"
              onClick={() => setStep("birthday")}
              disabled={saving}
              className="w-full text-xs text-gray-400 underline mt-2"
            >
              戻る
            </button>
          </div>
        )}

        {step === "siblings" && needsSiblingStep && (
          <SiblingRelationsForm
            childName={name}
            siblings={siblingTargets.map((s) => ({ id: s.id, name: s.name }))}
            initialRelations={initialRelations}
            saving={saving}
            error={error}
            submitLabel={isSiblingsOnly ? "保存する" : "登録を完了"}
            onSubmit={async (relations) => {
              const targetId = newChildId ?? childIdParam;
              if (!targetId) return;
              const targetChild = existingChildren.find((c) => c.id === targetId);
              const targetGender =
                gender ?? targetChild?.gender ?? ("other" as Gender);
              setSaving(true);
              setError("");
              await saveSiblingRelations(targetId, targetGender, relations);
            }}
            onSkip={isAdd ? () => finishRedirect() : undefined}
            onBack={
              isSiblingsOnly ? () => returnToAccount(false) : () => setStep("gender")
            }
          />
        )}

        {saving && step !== "siblings" && (
          <p className="text-center text-sm text-gray-400 mt-6">保存中...</p>
        )}
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
