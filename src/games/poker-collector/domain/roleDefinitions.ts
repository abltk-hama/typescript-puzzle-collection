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
}

const ALL: readonly PokerDifficulty[] = ["easy", "medium", "hard"];
const EASY_ONLY: readonly PokerDifficulty[] = ["easy"];

export const ROLE_DEFINITIONS: Record<PokerRoleType, RoleDefinition> = {
  royalFlush: {
    type: "royalFlush",
    name: "ロイヤルフラッシュ",
    score: 500,
    rank: 1,
    enabled: ALL,
    discardScope: "role",
  },
  straightFlush: {
    type: "straightFlush",
    name: "ストレートフラッシュ",
    score: 400,
    rank: 2,
    enabled: ALL,
    discardScope: "role",
  },
  fourOfAKind: {
    type: "fourOfAKind",
    name: "フォーオブアカインド",
    score: 300,
    rank: 3,
    enabled: ALL,
    discardScope: "role",
  },
  fullHouse: {
    type: "fullHouse",
    name: "フルハウス",
    score: 250,
    rank: 4,
    enabled: ALL,
    discardScope: "role",
  },
  flush: {
    type: "flush",
    name: "フラッシュ",
    score: 200,
    rank: 5,
    enabled: ALL,
    discardScope: "role",
  },
  straight: {
    type: "straight",
    name: "ストレート",
    score: 190,
    rank: 6,
    enabled: ALL,
    discardScope: "role",
  },
  skipStraight: {
    type: "skipStraight",
    name: "飛び地ストレート",
    score: 160,
    rank: 7,
    enabled: EASY_ONLY,
    discardScope: "role",
  },
  threeOfAKind: {
    type: "threeOfAKind",
    name: "スリーオブアカインド",
    score: 140,
    rank: 8,
    enabled: ALL,
    discardScope: "role",
  },
  fourCardFlush: {
    type: "fourCardFlush",
    name: "4枚フラッシュ",
    score: 120,
    rank: 9,
    enabled: EASY_ONLY,
    discardScope: "role",
  },
  fourCardStraight: {
    type: "fourCardStraight",
    name: "4枚ストレート",
    score: 100,
    rank: 10,
    enabled: EASY_ONLY,
    discardScope: "role",
  },
  twoPair: {
    type: "twoPair",
    name: "ツーペア",
    score: 90,
    rank: 11,
    enabled: ALL,
    discardScope: "role",
  },
  onePair: {
    type: "onePair",
    name: "ワンペア",
    score: 30,
    rank: 12,
    enabled: ALL,
    discardScope: "rank",
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
