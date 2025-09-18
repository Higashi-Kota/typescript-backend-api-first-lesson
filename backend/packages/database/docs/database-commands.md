# Database Commands Guide

データベース操作に必要な4つの基本コマンドを提供しています。すべてのコマンドは冪等性を考慮して設計されています。

## 🔄 1. データベース洗い替え（完全リセット）

```bash
pnpm db:fresh
```

**実行内容:**
1. 全テーブル・型定義を削除（DROP）
2. `sql/setup.sql`を実行してスキーマを作成（CREATE）  
3. シードデータを投入（POPULATE）

**冪等性:** 何度実行しても同じ結果になります

## 📝 2. スキーマ変更の適用

```bash
pnpm db:migrate:sql sql/migrations/202501151430_add_column.sql
```

**実行内容:**
- 指定したSQLファイルを実行
- マイグレーションファイルは`sql/migrations/`に配置

**命名規則:**
```
sql/migrations/
├── 202501150930_initial_setup.sql     # 2025年1月15日 09:30
├── 202501151200_add_indexes.sql       # 2025年1月15日 12:00
└── 202501151430_alter_columns.sql     # 2025年1月15日 14:30
```

**ファイル名形式:** `YYYYMMDDHHMM_description.sql`
- `YYYY`: 年（4桁）
- `MM`: 月（2桁）
- `DD`: 日（2桁）
- `HH`: 時（24時間表記、2桁）
- `MM`: 分（2桁）
- `_description`: マイグレーションの説明（スネークケース）

**冪等性:** SQLファイル内で`IF NOT EXISTS`や`IF EXISTS`を使用してください

## 🌱 3. データシーディング

```bash
pnpm db:seed
```

**オプション:**
```bash
pnpm db:seed --env development  # 開発環境用データ
pnpm db:seed --env test         # テスト環境用データ
pnpm db:seed --reset            # 既存データを削除してから投入
```

**冪等性:** `--reset`オプションで既存データをクリアしてから投入

## 🔍 4. 型定義の生成（Introspection）

```bash
pnpm db:introspect
```

**実行内容:**
1. データベースの現在の構造を読み取り
2. `src/schema.ts`を上書き生成
3. `src/relations.ts`を上書き生成

**冪等性:** 常に現在のデータベースから生成されるため、何度実行しても安全

---

## 📋 典型的なワークフロー

### 新規開発開始時
```bash
pnpm db:fresh          # 1. クリーンな状態から開始
```

### スキーマ変更時
```bash
# 1. SQLファイルを作成（現在時刻: 2025年1月15日 14:30）
echo "ALTER TABLE users ADD COLUMN age INT;" > sql/migrations/202501151430_add_age.sql

# 2. 変更を適用
pnpm db:migrate:sql sql/migrations/202501151430_add_age.sql

# 3. TypeScript型を更新
pnpm db:introspect
```

### テストデータのリフレッシュ
```bash
pnpm db:seed --reset   # 既存データを削除して再投入
```

## 💡 Tips

- **本番環境では`db:fresh`を使用しない** - データが全て削除されます
- **マイグレーションは時系列順に実行** - タイムスタンプ順で自動的に順序が管理されます
- **型生成は開発時のみ** - 本番環境では実行不要です
- **マイグレーション作成時刻を記録** - ファイル名に`YYYYMMDDHHMM`形式で記録することで履歴が明確になります