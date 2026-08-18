import { Deck } from "../../../common/cards";
import type { PokerCollectorPuzzle } from "../domain/pokerHandTypes";

export function generatePokerPuzzles(
  seed: number,
  difficulty: "easy" | "medium" | "hard"
): PokerCollectorPuzzle {
  const [targetScore, allowedRetries] = {
    easy: [300, 5],
    medium: [800, 3],
    hard: [1500, 1],
  }[difficulty];

  const deck = new Deck();
  // ランダムシャッフル
  deck.shuffle();

  const cardsLayout = deck.drawN(25);

  return {
    id: `pc_gen_${seed}`,
    title: `生成問題 (${difficulty})`,
    difficulty,
    cardsLayout,
    targetScore,
    allowedRetries,
    description: `ランダム生成された${difficulty}難易度の問題です。`,
  };
}


// Note: seededRandom() は将来の機能拡張用に予約されています
// let seedValue = 0;
// function seedRandom(seed: number) {
//   seedValue = seed;
// }
// function seededRandom(): number {
//   seedValue = (seedValue * 9301 + 49297) % 233280;
//   return seedValue / 233280;
// }

// Deck クラスのシャッフル前に seedRandom を呼ぶことで再現可能にしたい場合は、
// ここでカスタムシャッフル実装を追加