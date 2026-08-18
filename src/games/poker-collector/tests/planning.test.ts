import { describe, expect, it } from "vitest";
import { createCard } from "../../../common/cards";
import { detectPlanningRoles, findBestVisibleRolePlan } from "../domain/planning";

describe("Poker Collector planning support", () => {
  it("仮持ち札のカードだけで成立役を判定する", () => {
    const cards = [
      createCard("♠", "K"),
      createCard("♥", "K"),
      createCard("♦", "4"),
    ];
    const roles = detectPlanningRoles(cards, "hard");
    expect(roles.some((role) => role.type === "onePair")).toBe(true);
  });

  it("見えているカードからカード重複なしの最大得点役プランを返す", () => {
    const cards = [
      createCard("♠", "2"),
      createCard("♥", "3"),
      createCard("♦", "4"),
      createCard("♣", "5"),
      createCard("♠", "6"),
      createCard("♠", "K"),
      createCard("♥", "K"),
    ];
    const plan = findBestVisibleRolePlan(cards, "hard");

    expect(plan.roles.some((role) => role.type === "straight")).toBe(true);
    expect(plan.roles.some((role) => role.type === "onePair")).toBe(true);
    expect(plan.totalScore).toBe(220);
  });

  it("破棄済み役はヒントの最大得点探索にも使わない", () => {
    const cards = [
      createCard("♠", "K"),
      createCard("♥", "K"),
      createCard("♠", "A"),
      createCard("♥", "A"),
    ];
    const plan = findBestVisibleRolePlan(cards, "hard", new Set(["twoPair"]));

    expect(plan.roles.some((role) => role.type === "twoPair")).toBe(false);
    expect(plan.totalScore).toBe(60);
  });
});
