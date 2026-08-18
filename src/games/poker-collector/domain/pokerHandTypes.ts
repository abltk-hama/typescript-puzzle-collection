import type { Card, Rank } from "../../../common/cards";

export type PokerDifficulty = "easy" | "medium" | "hard";

export type PokerRoleType =
  | "royalFlush"
  | "straightFlush"
  | "fourOfAKind"
  | "fullHouse"
  | "flush"
  | "straight"
  | "skipStraight"
  | "fourCardFlush"
  | "fourCardStraight"
  | "threeOfAKind"
  | "twoPair"
  | "onePair";

export type PokerHandName =
  | "ロイヤルフラッシュ"
  | "ストレートフラッシュ"
  | "フォーオブアカインド"
  | "フルハウス"
  | "フラッシュ"
  | "ストレート"
  | "飛び地ストレート"
  | "4枚フラッシュ"
  | "4枚ストレート"
  | "スリーオブアカインド"
  | "ツーペア"
  | "ワンペア";

export interface PokerHand {
  key: string;
  type: PokerRoleType;
  name: string;
  cards: Card[];
  baseScore: number;
  rank: number;
  discardKey: string;
  pairRank?: Rank;
}

export interface DetectedRole extends PokerHand {
  isConfirmed: boolean;
}

export interface PokerCollectorPuzzle {
  id: string;
  title: string;
  difficulty: PokerDifficulty;
  cardsLayout: Card[];
  targetScore: number;
  allowedRetries: number;
  description?: string;
}

export type GraceReason = "role" | "confirmed" | "hold" | null;

export interface PokerCollectorState {
  difficulty: PokerDifficulty;
  cards: Card[];
  visibleIndices: number[];
  hand: Card[];
  takenCardIndices: Set<number>;
  fixedRoles: DetectedRole[];
  pendingRoles: PokerHand[];
  discardedRoleKeys: Set<string>;
  score: number;
  holdCount: number;
  graceTurnsRemaining: number;
  graceReason: GraceReason;
  retriesRemaining: number;
  history: GameAction[];
}

export type GameAction =
  | { type: "takeCard"; cardIndex: number }
  | { type: "confirmRole"; roleKey: string }
  | { type: "holdRole" }
  | { type: "discardRole"; discardKey: string }
  | { type: "retry" };
