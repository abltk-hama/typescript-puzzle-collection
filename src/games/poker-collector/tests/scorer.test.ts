import { describe, expect, it } from "vitest";
import {
  calculateBonusScore,
  calculateScoreBreakdown,
  calculateTotalScore,
} from "../domain/scorer";
import type { DetectedRole, PokerRoleType } from "../domain/pokerHandTypes";

function role(type: PokerRoleType, name: string, score: number, rank: number): DetectedRole {
  return {
    key: `${type}-test`,
    type,
    name,
    cards: [],
    baseScore: score,
    rank,
    discardKey: type,
    isConfirmed: true,
  };
}

describe("Scorer", () => {
  it("3役以上に複合役ボーナスを加算する", () => {
    expect(calculateBonusScore(1)).toBe(0);
    expect(calculateBonusScore(2)).toBe(0);
    expect(calculateBonusScore(3)).toBe(150);
    expect(calculateBonusScore(4)).toBe(300);
    expect(calculateBonusScore(5)).toBe(500);
    expect(calculateBonusScore(6)).toBe(500);
  });

  it("基本点とボーナスの合計を計算する", () => {
    const roles = [
      role("royalFlush", "ロイヤルフラッシュ", 500, 1),
      role("fullHouse", "フルハウス", 250, 4),
      role("onePair", "Aのワンペア", 30, 12),
    ];
    expect(calculateTotalScore(roles)).toBe(930);
  });

  it("内訳を返す", () => {
    const roles = [
      role("flush", "フラッシュ", 200, 5),
      role("onePair", "Kのワンペア", 30, 12),
    ];
    const breakdown = calculateScoreBreakdown(roles);
    expect(breakdown).toEqual({ baseScore: 230, bonusScore: 0, totalScore: 230 });
  });
});
