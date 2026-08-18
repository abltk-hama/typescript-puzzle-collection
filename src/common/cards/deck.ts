import { RANKS, SUITS, createCard, type Card } from "./card";

export class Deck {
  cards: Card[];

  constructor(cards?: Card[]) {
    this.cards = cards ?? this.createStandardDeck();
  }

  // 標準52枚デッキ作成
  private createStandardDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push(createCard(suit, rank));
      }
    }
    return deck;
  }

  // シャッフル（Fisher-Yates）
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  // デッキから1枚抽出
  draw(): Card | undefined {
    return this.cards.pop();
  }

  // N枚抽出
  drawN(n: number): Card[] {
    return this.cards.splice(0, n);
  }

  // デッキの残り枚数
  remaining(): number {
    return this.cards.length;
  }

  // リセット
  reset(): void {
    this.cards = this.createStandardDeck();
  }
}