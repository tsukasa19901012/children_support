type AdminUser = { id: string; email?: string };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} が未設定です`);
  return value;
}

function adminHeaders(serviceKey: string): HeadersInit {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

function e2eEmail(): string {
  return process.env.E2E_TEST_EMAIL?.trim() || "e2e-auto@tonarikko.com";
}

async function findE2eUserId(): Promise<string> {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = e2eEmail();

  const res = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=200`,
    { headers: adminHeaders(serviceKey) }
  );

  if (!res.ok) {
    throw new Error(`listUsers failed (${res.status}): ${await res.text()}`);
  }

  const json = (await res.json()) as { users?: AdminUser[] };
  const user = json.users?.find((u) => u.email === email);
  if (!user) throw new Error(`E2E ユーザーが見つかりません: ${email}`);
  return user.id;
}

export type E2eBillingPreset = "trial" | "free" | "plus";

/** E2E 用に users.plan / trial_ends_at を設定（service_role + REST） */
export async function setE2eUserBilling(preset: E2eBillingPreset): Promise<void> {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const userId = await findE2eUserId();

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const body =
    preset === "trial"
      ? { plan: "free", trial_ends_at: trialEnds.toISOString() }
      : preset === "free"
        ? {
            plan: "free",
            trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          }
        : { plan: "plus" };

  const res = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...adminHeaders(serviceKey),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`users 更新失敗 (${res.status}): ${await res.text()}`);
  }
}
