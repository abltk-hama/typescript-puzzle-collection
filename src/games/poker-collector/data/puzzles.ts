import { Deck } from "../../../common/cards";
import type { PokerCollectorPuzzle } from "../domain/pokerHandTypes";

export async function loadBundledPuzzles(): Promise<PokerCollectorPuzzle[]> {
  // 実装: public/puzzles/poker-collector/puzzles.json から読み込み
  // ここでは空の配列を返す
  return [];
}

export const BUILTIN_PUZZLES: PokerCollectorPuzzle[] = [
  {
    id: "pc_easy_1",
    title: "やさしい問題 #1",
    difficulty: "easy",
    cardsLayout: generateInitialCards(1),
    targetScore: 300,
    allowedRetries: 5,
    description: "初心者向けの易しい問題です。",
  },
  {
    id: "pc_easy_2",
    title: "やさしい問題 #2",
    difficulty: "easy",
    cardsLayout: generateInitialCards(2),
    targetScore: 300,
    allowedRetries: 5,
    description: "初心者向けの易しい問題です。",
  },
  {
    id: "pc_medium_1",
    title: "ふつう問題 #1",
    difficulty: "medium",
    cardsLayout: generateInitialCards(3),
    targetScore: 800,
    allowedRetries: 3,
    description: "標準難易度の問題です。",
  },
  {
    id: "pc_medium_2",
    title: "ふつう問題 #2",
    difficulty: "medium",
    cardsLayout: generateInitialCards(4),
    targetScore: 800,
    allowedRetries: 3,
    description: "標準難易度の問題です。",
  },
  {
    id: "pc_hard_1",
    title: "むずかしい問題 #1",
    difficulty: "hard",
    cardsLayout: generateInitialCards(5),
    targetScore: 1200,
    allowedRetries: 1,
    description: "上級者向けの難しい問題です。",
  },
];

function generateInitialCards(_seed: number) {
  const deck = new Deck();
  deck.shuffle();
  return deck.drawN(25);
}