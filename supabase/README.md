# supabase/

| ディレクトリ | 内容 |
|-------------|------|
| [migrations/](migrations/) | DB スキーマ・移行 SQL（[README](migrations/README.md) 参照） |
| [email-templates/](email-templates/) | Auth メール HTML・件名・反映手順 |

## よく使う操作

```bash
# メールテンプレートを Dashboard に反映（要 SUPABASE_ACCESS_TOKEN）
npm run supabase:apply-email-templates
```

本番 DB 変更は [migrations/README.md](migrations/README.md) の手順に従い、破壊的変更は事前確認してください。
