# TypeScript パズルゲーム集

Python／PySide6版を基準実装として段階移植する、React製パズルゲーム集です。

## 開発

- `npm run dev`: 開発サーバー
- `npm test`: Vitest
- `npm run lint`: lint
- `npm run build`: 型検査と本番ビルド

現在の実装範囲は共通アプリ基盤、ライツアウト、15パズル、マスターマインド、迷路です。問題JSONはPython版の現行形式を共通仕様v1として読み込みます。
