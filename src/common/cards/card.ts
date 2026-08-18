// トランプカードの基本型定義

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export const SUITS: readonly Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: readonly Rank[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
];

// ランクの数値化（ストレート判定用）
export const rankValue: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14
};

// トランプカード
export interface Card {
  suit: Suit;
  rank: Rank;
  id?: string;  // 重複カード区別用
}

// カード生成
export function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id };
}

// カード表示文字列（例：A♠, 10♥）
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

// カードの等値性判定
export function isSameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank && (a.id === b.id || !a.id || !b.id);
}

// スーツの表示名
export function suitToJapanese(suit: Suit): string {
  return { "♠": "スペード", "♥": "ハート", "♦": "ダイヤ", "♣": "クラブ" }[suit];
}