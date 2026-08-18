// 共通カードシステムのエクスポート集約

// Card 型関連
export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  id?: string;
}

export const SUITS: readonly Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: readonly Rank[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"
];

export const rankValue: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14
};

export function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id };
}

export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function isSameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank && (a.id === b.id || !a.id || !b.id);
}

export function suitToJapanese(suit: Suit): string {
  return { "♠": "スペード", "♥": "ハート", "♦": "ダイヤ", "♣": "クラブ" }[suit];
}

// Deck クラス
export class Deck {
  cards: Card[];

  constructor(cards?: Card[]) {
    this.cards = cards ?? this.createStandardDeck();
  }

  private createStandardDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(createCard(suit, rank));
      }
    }
    return deck;
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(): Card | undefined {
    return this.cards.pop();
  }

  drawN(n: number): Card[] {
    return this.cards.splice(0, n);
  }

  remaining(): number {
    return this.cards.length;
  }

  reset(): void {
    this.cards = this.createStandardDeck();
  }
}

// マッチャー関数
export function filterBySuit(cards: Card[], suit: Suit): Card[] {
  return cards.filter((c) => c.suit === suit);
}

export function filterByRank(cards: Card[], rank: Rank): Card[] {
  return cards.filter((c) => c.rank === rank);
}

export function filterBySuits(cards: Card[], suits: Suit[]): Card[] {
  return cards.filter((c) => suits.includes(c.suit));
}

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