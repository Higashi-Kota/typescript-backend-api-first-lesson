# @beauty-salon-frontend/ui

shadcn/ui CLIで管理されるコンポーネントライブラリ

## セットアップ

```bash
# 初回のみ実行（設定済み）
npx shadcn init

# コンポーネント追加
npx shadcn add [component]
```

## よく使うコマンド

```bash
# 基本コンポーネント
npx shadcn add button card input label select textarea checkbox switch

# レイアウト
npx shadcn add separator skeleton accordion tabs sidebar

# フィードバック
npx shadcn add alert dialog toast tooltip badge progress

# ナビゲーション
npx shadcn add dropdown-menu navigation-menu breadcrumb

# データ表示
npx shadcn add table calendar avatar popover

# フォーム
npx shadcn add form date-picker slider toggle
```

### オプション

- `--yes` - 確認スキップ
- `--overwrite` - 既存ファイル上書き
- `-c [path]` - components.json指定

## 構造

```
src/
├── components/     # コンポーネント
├── lib/utils.ts    # ユーティリティ
├── hooks/          # カスタムフック
└── styles/         # CSS
```

## カスタマイズ

コンポーネントは追加後、自由に編集可能：

```tsx
// src/components/button.tsx
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "...",
      // カスタム追加
      brand: "bg-brand-500 hover:bg-brand-600"
    }
  }
})
```

## トラブルシューティング

| 問題 | 解決方法 |
|------|----------|
| パスエラー | `tsconfig.json`の`paths`確認 |
| スタイル未適用 | `index.css`に`@tailwind`ディレクティブ確認 |
| 依存関係エラー | `pnpm install` |
| TypeScriptエラー | `pnpm typecheck` |

## リンク

- [公式ドキュメント](https://ui.shadcn.com)
- [コンポーネント一覧](https://ui.shadcn.com/docs/components)