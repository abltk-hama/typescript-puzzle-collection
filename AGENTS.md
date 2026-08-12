# Project AGENTS v1.0

## Purpose
プロジェクト固有のAI運用ルールを定義する。
共通ルールは ~/.codex/AGENTS.md に従う。

## Read Order
1. PROJECT_AGENT_CONTEXT.md
2. 対象コード
3. 関連テスト
4. docs
5. 必要なSkill

## Working Policy
調査→設計→OPTIONS→USER ALIGNMENT→詳細検討→READY→
ユーザーの明示的な実装指示→実装→検証

## Context Policy
- PROJECT_AGENT_CONTEXT.md は読み取り専用
- 必要な章のみ参照
- 勝手に編集しない
- 更新候補は CONTEXT_UPDATE_PROPOSALS として提示
- 承認後のみ更新

## Skill Policy
PROJECT_AGENT_CONTEXT.md の Skill Routing に従う。

## Proposal Policy
改善案は PROJECT_PROPOSALS として案名のみ提示する。

## Skill Usage
必要な作業では
PROJECT_AGENT_CONTEXT.md
のSkill Routingに従い、
対応するSkill Templateを参照する。

## Skill Template Definition

Skill Templateとは

プロジェクト内で繰り返し利用する
標準作業手順を定義した文書である。

Skill Templateは

・Purpose
・When to Use
・Workflow
・Checklist
・Validation
・Expected Output

を共通構造として持つ。

Skill Templateは
AIの思考を拘束するものではなく、

作業品質の均一化、
判断漏れ防止、
成果物の一貫性を目的として利用する。