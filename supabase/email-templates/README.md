# メールテンプレート（Supabase Auth + Resend）

となりっこの認証メール用 HTML テンプレートです。  
Supabase Dashboard → **Authentication → Email Templates** に貼り付けて使用します。

表示文言の正は `src/lib/brand.ts` です。

---

## ファイル対応表

| ファイル | Supabase Dashboard のテンプレート | 件名（`subjects.json`） |
|----------|-----------------------------------|-------------------------|
| `magic-link.html` | **Magic Link** | `{{ .Token }} がログイン確認コード｜となりっこ` |
| `confirm-signup.html` | **Confirm signup** | `【となりっこ】メールアドレスの確認` |
| `invite.html` | **Invite user** | `【となりっこ】ご招待のお知らせ` |
| `recovery.html` | **Reset password** | `{{ .Token }} が確認コード｜となりっこ` |
| `email-change.html` | **Change Email Address** | `【となりっこ】メールアドレス変更の確認` |
| `reauthentication.html` | **Reauthentication** | `{{ .Token }} が本人確認コード｜となりっこ` |

**最重要**: 本アプリは **6桁 OTP** でログインするため、**Magic Link** テンプレートを `magic-link.html` の内容に差し替えてください。

---

## 設定手順

### 方法 A: 自動反映（推奨）

1. [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens) でトークンを作成
2. `.env.local` に追加:

```bash
SUPABASE_ACCESS_TOKEN=sbp_...
```

3. 実行:

```bash
npm run supabase:apply-email-templates
```

Site URL・Redirect URLs・全テンプレート・送信者名（となりっこ）を一括反映します。

### 方法 B: Dashboard 手動

1. **SMTP（Resend）**

Dashboard → **Project Settings → Authentication → SMTP Settings**

| 項目 | 値（例） |
|------|----------|
| Sender email | `noreply@mail.tonarikko.com` |
| Sender name | `となりっこ` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API Key |

2. **URL 設定**

Dashboard → **Authentication → URL Configuration**

| 項目 | 推奨値 |
|------|--------|
| Site URL | `https://www.tonarikko.com` |
| Redirect URLs | `https://www.tonarikko.com/**` |

> `tonarikko.com` → `www` リダイレクトで Magic Link のハッシュが消えるため、**Site URL は www 付き**に統一してください。

3. **テンプレート貼り付け**

各テンプレートで:

1. **Subject** に `subjects.json` の該当行をコピー
2. **Body (HTML)** に対応する `.html` の全文をコピー
3. **Save**

Magic Link には `magic-link.txt` を参考にプレーンテキスト版も設定できる場合は併用してください（Resend / クライアントによっては HTML のみ）。

4. **動作確認**

1. https://www.tonarikko.com/login でメール送信
2. 件名に 6 桁コードが表示されること
3. メール内 OTP をログイン画面で入力できること

---

## デザイン方針

- **トーン**: 落ち着き・温かさ（RULES.md / プロダクト原則に準拠）
- **レイアウト**: モバイルファースト、560px カード、ログイン画面と同系色（blue-500 / gray）
- **OTP 優先**: リンク prefetch 対策のため、主 CTA は `/login` への誘導。コードを大きく表示
- **初回訴求**: 14 日トライアル（Plus 相当）を Magic Link / Confirm signup に記載
- **免責**: 医療診断ではない旨をフッター付近に記載

---

## 利用可能な変数（Supabase）

| 変数 | 説明 |
|------|------|
| `{{ .Token }}` | 6 桁 OTP |
| `{{ .Email }}` | 宛先メール |
| `{{ .SiteURL }}` | Site URL 設定値 |
| `{{ .ConfirmationURL }}` | Supabase 検証 URL（招待など限定的に使用） |
| `{{ .RedirectTo }}` | クライアント指定のリダイレクト先 |

---

## 更新履歴

- 2026-05: となりっこブランド、Free/Plus、14 日トライアル、OTP ログインに合わせて全面刷新
