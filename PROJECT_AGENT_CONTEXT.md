# PROJECT_AGENT_CONTEXT v1.0

## Document Status
|項目|値|
|---|---|
|Version|1.0|
|Status|VERIFIED|

## Project Summary
- Purpose:
- Scope:
- Current Phase:

## Working Agreement
- 比較表を優先
- Ground Truth JSONを意味の正本
- SVGを描画の正本
- PNGは派生物
- UNKNOWNはUNKNOWNのまま扱う

## Canonical Sources
|対象|正本|
|---|---|
|API||
|DB||
|画像仕様||
|依存||

## Repository Structure
|Path|責務|
|---|---|
|src||
|tests||
|docs||

## Skill Template

`.agents/skills/` に配置されたファイルは、
プロジェクト共通の作業テンプレート（Skill Template）である。

これらは

- 作業の標準手順
- 判断漏れ防止
- 出力形式
- 検証手順

を定義する。

必要になった時のみ対応するSkillを参照する。

全Skillを毎回読む必要はない。

## Skill Routing
|作業|Skill|
|---|---|
|初回解析|repository-survey|
|新機能追加|feature-development|
|バグ修正|bug-fix|
|リファクタリング|refactoring|
|検証|validation|
|提案|proposal|

## Known Constraints

## Known Pitfalls

## Improvement Candidates

## Context Update Candidates
承認後に反映する。
