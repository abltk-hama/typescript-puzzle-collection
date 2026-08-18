import { describe, expect, it } from "vitest";
import { createCard } from "../../../common/cards";
import {
  findOptimalRolePlan,
  runBalanceSimulation,
} from "../simulation/balanceSimulator";
import { getRoleVariant } from "../simulation/roleVariants";

describe("poker collector balance simulator", () => {
  it("compares every role variant on the same seeded boards", () => {
    const result = runBalanceSimulation({ sampleCount: 1, seed: 12345, boardSize: 10 });

    expect(result.variants.map((variant) => variant.variantId)).toEqual([
      "standard",
      "fourCardFlush",
      "fourCardStraight",
      "skipStraight",
      "fourCardRoles",
      "allOriginal",
    ]);
    expect(result.variants.every((variant) => variant.scores.length === 1)).toBe(true);

    const standard = result.variants.find((variant) => variant.variantId === "standard")!;
    const allOriginal = result.variants.find((variant) => variant.variantId === "allOriginal")!;
    expect(allOriginal.scores.every((score, index) => score >= standard.scores[index])).toBe(true);
  });

  it("lets a four-card-only variant score a four-card straight", () => {
    const cards = [
      createCard("♠", "2", "1"),
      createCard("♥", "3", "2"),
      createCard("♦", "4", "3"),
      createCard("♣", "5", "4"),
    ];

    const standard = findOptimalRolePlan(cards, getRoleVariant("standard"));
    const fourStraight = findOptimalRolePlan(cards, getRoleVariant("fourCardStraight"));

    expect(standard.totalScore).toBe(0);
    expect(fourStraight.totalScore).toBe(100);
    expect(fourStraight.roles[0]?.type).toBe("fourCardStraight");
  });

  it("is reproducible with the same seed", () => {
    const first = runBalanceSimulation({ sampleCount: 1, seed: 777, boardSize: 10});
    const second = runBalanceSimulation({ sampleCount: 1, seed: 777, boardSize: 10 });

    expect(second.variants.map((variant) => variant.scores)).toEqual(
      first.variants.map((variant) => variant.scores)
    );
  });
});
