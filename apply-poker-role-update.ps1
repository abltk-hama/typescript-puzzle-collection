$ErrorActionPreference = "Stop"

$root = (Get-Location).Path

function Read-Utf8([string]$path) {
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}
function Write-Utf8([string]$path, [string]$content) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}
function Replace-Once([string]$text, [string]$old, [string]$new, [string]$label) {
    if (-not $text.Contains($old)) {
        throw "置換対象が見つかりません: $label"
    }
    return $text.Replace($old, $new)
}

$typesPath = Join-Path $root "src\games\poker-collector\domain\pokerHandTypes.ts"
$defsPath = Join-Path $root "src\games\poker-collector\domain\roleDefinitions.ts"
$genPath = Join-Path $root "src\games\poker-collector\generation\generate.ts"
$puzzlesPath = Join-Path $root "src\games\poker-collector\data\puzzles.ts"
$gamePath = Join-Path $root "src\games\poker-collector\ui\PokerGame.tsx"
$roleListPath = Join-Path $root "src\games\poker-collector\ui\RoleListDialog.tsx"
$cssPath = Join-Path $root "src\App.css"

# 1) 表示名
$types = Read-Utf8 $typesPath
$types = $types.Replace('"飛び地ストレート"', '"スキップストレート"')
Write-Utf8 $typesPath $types

# 2) 役定義を更新（説明・カテゴリ追加、追加役を全難易度で有効化）
$defs = @'
import type {
  PokerDifficulty,
  PokerHandName,
  PokerRoleType,
} from "./pokerHandTypes";

export interface RoleDefinition {
  type: PokerRoleType;
  name: PokerHandName;
  score: number;
  rank: number;
  enabled: readonly PokerDifficulty[];
  discardScope: "rank" | "role";
  category: "standard" | "collector";
  description: string;
}

const ALL: readonly PokerDifficulty[] = ["easy", "medium", "hard"];

export const ROLE_DEFINITIONS: Record<PokerRoleType, RoleDefinition> = {
  royalFlush: {
    type: "royalFlush",
    name: "ロイヤルフラッシュ",
    score: 500,
    rank: 1,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "同じスーツの A・K・Q・J・10",
  },
  straightFlush: {
    type: "straightFlush",
    name: "ストレートフラッシュ",
    score: 400,
    rank: 2,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "同じスーツの5枚連番",
  },
  fourOfAKind: {
    type: "fourOfAKind",
    name: "フォーオブアカインド",
    score: 300,
    rank: 3,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "同じランクを4枚そろえる",
  },
  fullHouse: {
    type: "fullHouse",
    name: "フルハウス",
    score: 250,
    rank: 4,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "同じランク3枚と、別ランクのペア",
  },
  flush: {
    type: "flush",
    name: "フラッシュ",
    score: 200,
    rank: 5,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "同じスーツを5枚そろえる",
  },
  straight: {
    type: "straight",
    name: "ストレート",
    score: 190,
    rank: 6,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "ランクが連続する5枚",
  },
  skipStraight: {
    type: "skipStraight",
    name: "スキップストレート",
    score: 160,
    rank: 7,
    enabled: ALL,
    discardScope: "role",
    category: "collector",
    description: "1ランクずつ飛ばした5枚の並び（例：A・3・5・7・9）",
  },
  threeOfAKind: {
    type: "threeOfAKind",
    name: "スリーオブアカインド",
    score: 140,
    rank: 8,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "同じランクを3枚そろえる",
  },
  fourCardFlush: {
    type: "fourCardFlush",
    name: "4枚フラッシュ",
    score: 120,
    rank: 9,
    enabled: ALL,
    discardScope: "role",
    category: "collector",
    description: "同じスーツを4枚そろえる",
  },
  fourCardStraight: {
    type: "fourCardStraight",
    name: "4枚ストレート",
    score: 100,
    rank: 10,
    enabled: ALL,
    discardScope: "role",
    category: "collector",
    description: "ランクが連続する4枚",
  },
  twoPair: {
    type: "twoPair",
    name: "ツーペア",
    score: 90,
    rank: 11,
    enabled: ALL,
    discardScope: "role",
    category: "standard",
    description: "異なるランクのペアを2組そろえる",
  },
  onePair: {
    type: "onePair",
    name: "ワンペア",
    score: 30,
    rank: 12,
    enabled: ALL,
    discardScope: "rank",
    category: "standard",
    description: "同じランクを2枚そろえる（破棄はランク単位）",
  },
};

export interface DifficultyRules {
  roleGraceTurns: number;
  confirmedGraceTurns: number;
  holdExtensionTurns: number;
  maxHolds: number;
}

export const DIFFICULTY_RULES: Record<PokerDifficulty, DifficultyRules> = {
  easy: {
    roleGraceTurns: 2,
    confirmedGraceTurns: 2,
    holdExtensionTurns: 2,
    maxHolds: 3,
  },
  medium: {
    roleGraceTurns: 1,
    confirmedGraceTurns: 1,
    holdExtensionTurns: 1,
    maxHolds: 3,
  },
  hard: {
    roleGraceTurns: 0,
    confirmedGraceTurns: 0,
    holdExtensionTurns: 1,
    maxHolds: 3,
  },
};

export function isRoleEnabled(type: PokerRoleType, difficulty: PokerDifficulty): boolean {
  return ROLE_DEFINITIONS[type].enabled.includes(difficulty);
}
'@
Write-Utf8 $defsPath $defs

# 3) Hard目標点
$gen = Read-Utf8 $genPath
$gen = $gen.Replace("hard: [1500, 1]", "hard: [1200, 1]")
Write-Utf8 $genPath $gen

$puzzles = Read-Utf8 $puzzlesPath
$puzzles = $puzzles.Replace("targetScore: 1500", "targetScore: 1200")
Write-Utf8 $puzzlesPath $puzzles

# 4) 役一覧コンポーネント新規作成
$roleList = @'
import { ROLE_DEFINITIONS } from "../domain/roleDefinitions";
import type { DetectedRole, PokerRoleType } from "../domain/pokerHandTypes";

const ORDERED_TYPES = (Object.keys(ROLE_DEFINITIONS) as PokerRoleType[])
  .sort((a, b) => ROLE_DEFINITIONS[a].rank - ROLE_DEFINITIONS[b].rank);

export function RoleListDialog({
  discardedRoleKeys,
  fixedRoles,
  onClose,
}: {
  discardedRoleKeys: ReadonlySet<string>;
  fixedRoles: DetectedRole[];
  onClose: () => void;
}) {
  const confirmedTypes = new Set(fixedRoles.map((role) => role.type));
  const discardedWholeRoles = new Set(
    Array.from(discardedRoleKeys).filter((key) => !key.includes(":"))
  );
  const discardedPairRanks = Array.from(discardedRoleKeys)
    .filter((key) => key.startsWith("onePair:"))
    .map((key) => key.split(":")[1])
    .filter(Boolean);

  const standard = ORDERED_TYPES.filter(
    (type) => ROLE_DEFINITIONS[type].category === "standard"
  );
  const collector = ORDERED_TYPES.filter(
    (type) => ROLE_DEFINITIONS[type].category === "collector"
  );

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="role-dialog poker-role-dialog poker-role-list-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="役一覧"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="poker-role-list-header">
          <div>
            <h2>役一覧</h2>
            <p className="dialog-hint">このゲームで使用できる役と配点です。</p>
          </div>
          <button className="button secondary" onClick={onClose}>閉じる</button>
        </div>

        <RoleSection
          title="標準役"
          types={standard}
          confirmedTypes={confirmedTypes}
          discardedWholeRoles={discardedWholeRoles}
          discardedPairRanks={discardedPairRanks}
        />
        <RoleSection
          title="Poker Collector役"
          types={collector}
          confirmedTypes={confirmedTypes}
          discardedWholeRoles={discardedWholeRoles}
          discardedPairRanks={discardedPairRanks}
        />
      </div>
    </div>
  );
}

function RoleSection({
  title,
  types,
  confirmedTypes,
  discardedWholeRoles,
  discardedPairRanks,
}: {
  title: string;
  types: PokerRoleType[];
  confirmedTypes: ReadonlySet<PokerRoleType>;
  discardedWholeRoles: ReadonlySet<string>;
  discardedPairRanks: string[];
}) {
  return (
    <section className="poker-role-list-section">
      <h3>{title}</h3>
      <div className="poker-role-list">
        {types.map((type) => {
          const definition = ROLE_DEFINITIONS[type];
          const discarded = discardedWholeRoles.has(type);
          const confirmed = confirmedTypes.has(type);
          return (
            <article
              key={type}
              className={`poker-role-list-item ${discarded ? "discarded" : ""}`}
            >
              <div className="poker-role-list-title">
                <strong>{definition.name}</strong>
                <strong>{definition.score}点</strong>
              </div>
              <span>{definition.description}</span>
              <div className="poker-role-list-status">
                {confirmed && <span className="role-status confirmed">✓ 確定済み</span>}
                {discarded && <span className="role-status discarded">× 破棄済み</span>}
                {type === "onePair" && discardedPairRanks.length > 0 && (
                  <span className="role-status discarded">
                    破棄済みランク：{discardedPairRanks.join(" / ")}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
'@
Write-Utf8 $roleListPath $roleList

# 5) PokerGameへ役一覧UIを追加
$game = Read-Utf8 $gamePath

if (-not $game.Contains('import { RoleListDialog } from "./RoleListDialog";')) {
    $game = Replace-Once $game `
        'import { RoleConfirmDialog } from "./RoleConfirmDialog";' `
        "import { RoleConfirmDialog } from `"./RoleConfirmDialog`";`r`nimport { RoleListDialog } from `"./RoleListDialog`";" `
        "RoleListDialog import"
}

if (-not $game.Contains('const [roleListOpen, setRoleListOpen] = useState(false);')) {
    $game = Replace-Once $game `
        '  const [hintCardIndices, setHintCardIndices] = useState<number[]>([]);' `
        "  const [hintCardIndices, setHintCardIndices] = useState<number[]>([]);`r`n  const [roleListOpen, setRoleListOpen] = useState(false);" `
        "roleListOpen state"
}

if (-not $game.Contains('onClick={() => setRoleListOpen(true)}>役一覧</button>')) {
    $game = Replace-Once $game `
        '            <button className="button secondary" onClick={showCardHint}>カードヒント</button>' `
        "            <button className=`"button secondary`" onClick={showCardHint}>カードヒント</button>`r`n            <button className=`"button secondary`" onClick={() => setRoleListOpen(true)}>役一覧</button>" `
        "役一覧button"
}

if (-not $game.Contains('<RoleListDialog')) {
    $anchor = @'
        {state.pendingRoles.length > 0 && (
          <RoleConfirmDialog
            detectedRoles={state.pendingRoles}
            holdCountRemaining={holdCountRemaining}
            canHold={boardRemaining > 0}
            onConfirm={handleConfirmRole}
            onHold={handleHoldRole}
            onDiscard={handleDiscardRole}
          />
        )}
'@
    $insert = $anchor + @'

        {roleListOpen && (
          <RoleListDialog
            discardedRoleKeys={state.discardedRoleKeys}
            fixedRoles={state.fixedRoles}
            onClose={() => setRoleListOpen(false)}
          />
        )}
'@
    $game = Replace-Once $game $anchor $insert "RoleListDialog rendering"
}

$game = $game.Replace('skipStraight: "飛び地ストレート"', 'skipStraight: "スキップストレート"')
Write-Utf8 $gamePath $game

# 6) CSS（未追加の場合のみ末尾へ）
$css = Read-Utf8 $cssPath
if (-not $css.Contains("/* Poker Collector - role reference */")) {
    $css += @'

/* Poker Collector - role reference */
.poker-role-list-dialog {
  display: grid;
  gap: 18px;
}
.poker-role-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.poker-role-list-header h2,
.poker-role-list-section h3 {
  margin: 0;
}
.poker-role-list-header .dialog-hint {
  margin-bottom: 0;
}
.poker-role-list-section {
  display: grid;
  gap: 10px;
}
.poker-role-list {
  display: grid;
  gap: 8px;
}
.poker-role-list-item {
  display: grid;
  gap: 5px;
  padding: 10px 12px;
  border: 1px solid #d4e0e6;
  border-radius: 10px;
  background: #fff;
}
.poker-role-list-item.discarded {
  background: #fff7f7;
  opacity: 0.72;
}
.poker-role-list-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.poker-role-list-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.86rem;
}
.role-status.confirmed {
  color: #047857;
  font-weight: 700;
}
.role-status.discarded {
  color: #991b1b;
  font-weight: 700;
}
'@
    Write-Utf8 $cssPath $css
}

Write-Host ""
Write-Host "Poker Collector の修正を適用しました。" -ForegroundColor Green
Write-Host "続けて以下を実行してください:"
Write-Host "  npm test"
Write-Host "  npm run lint"
Write-Host "  npm run build"
Write-Host "  git diff -- src/games/poker-collector src/App.css"
