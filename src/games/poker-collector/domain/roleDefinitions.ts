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