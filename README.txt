Windows PowerShell 5.1 対応版（UTF-8 BOM付き）

適用:

Set-Location "C:\Users\nibgc\Documents\ChatGPT\TypeScript_パズルゲーム集"

powershell -ExecutionPolicy Bypass -File ".\apply-poker-role-update.ps1"

適用後:

npm test
npm run lint
npm run build

git diff -- src/games/poker-collector src/App.css

以前の apply-poker-role-update.ps1 は削除し、
このZIP内のファイルで置き換えてください。
