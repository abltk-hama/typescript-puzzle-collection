import { RANKS, SUITS, rankValue, type Card, type Rank, type Suit } from "./card";

// スーツでフィルタ
export function filterBySuit(cards: Card[], suit: Suit): Card[] {
  return cards.filter((c) => c.suit === suit);
}

// ランクでフィルタ
export function filterByRank(cards: Card[], rank: Rank): Card[] {
  return cards.filter((c) => c.rank === rank);
}

// 複数スーツでフィルタ
export function filterBySuits(cards: Card[], suits: Suit[]): Card[] {
  return cards.filter((c) => suits.includes(c.suit));
}

// ランク別にグループ化
export function countByRank(cards: Card[]): Map<Rank, Card[]> {
  const map = new Map<Rank, Card[]>();
  for (const rank of RANKS) {
    const matching = filterByRank(cards, rank);
    if (matching.length > 0) {
      map.set(rank, matching);
    }
  }
  return map;
}

// スーツ別にグループ化
export function countBySuit(cards: Card[]): Map<Suit, Card[]> {
  const map = new Map<Suit, Card[]>();
  for (const suit of SUITS) {
    const matching = filterBySuit(cards, suit);
    if (matching.length > 0) {
      map.set(suit, matching);
    }
  }
  return map;
}

// ランクの連番判定（ストレート検出用）
export function findSequences(cards: Card[], length: number = 5): Card[][] {
  const uniqueRanks = Array.from(new Set(cards.map((c) => rankValue[c.rank]))).sort(
    (a, b) => b - a
  );

  const sequences: Card[][] = [];

  for (let i = 0; i <= uniqueRanks.length - length; i++) {
    let isSequence = true;
    for (let j = 0; j < length - 1; j++) {
      if (uniqueRanks[i + j] !== uniqueRanks[i + j + 1] + 1) {
        isSequence = false;
        break;
      }
    }

    if (isSequence) {
      const targetValues = uniqueRanks.slice(i, i + length);
      const seqCards: Card[] = [];
      for (const value of targetValues) {
        const card = cards.find((c) => rankValue[c.rank] === value);
        if (card) seqCards.push(card);
      }
      if (seqCards.length === length) {
        sequences.push(seqCards);
      }
    }
  }

  return sequences;
}