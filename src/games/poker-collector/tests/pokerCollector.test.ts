import { describe, expect, it } from "vitest";
import { createCard, type Card } from "../../../common/cards";
import {
  confirmRole,
  discardRole,
  initialGame,
  takeCard,
} from "../domain/pokerCollector";
import type { PokerCollectorPuzzle, PokerCollectorState } from "../domain/pokerHandTypes";

function puzzle(difficulty: "easy" | "medium" | "hard" = "hard"): PokerCollectorPuzzle {
  const filler: Card[] = [
    createCard("♠", "3"),
    createCard("♥", "3"),
    createCard("♦", "7"),
    createCard("♣", "8"),
    createCard("♠", "9"),
    createCard("♥", "10"),
    createCard("♦", "J"),
    createCard("♣", "Q"),
    createCard("♠", "K"),
    createCard("♥", "A"),
  ];
  while (filler.length < 25) filler.push(createCard("♠", "2", String(filler.length)));
  return {
    id: "test",
    title: "test",
    difficulty,
    cardsLayout: filler,
    targetScore: 9999,
    allowedRetries: 1,
  };
}

function forceVisible(state: PokerCollectorState, indices: number[]): PokerCollectorState {
  return { ...state, visibleIndices: indices };
}

describe("PokerCollector state", () => {
  it("Hardではペア成立時に即候補を提示し、確定時は2枚だけ手札から外す", () => {
    let state = forceVisible(initialGame(puzzle("hard")), [0, 1]);
    state = takeCard(state, 0);
    state = forceVisible(state, [1]);
    state = takeCard(state, 1);

    const pair = state.pendingRoles.find((role) => role.type === "onePair");
    expect(pair).toBeDefined();
    expect(state.hand).toHaveLength(2);

    state = confirmRole(state, pair!.key);
    expect(state.hand).toHaveLength(0);
    expect(state.fixedRoles[0].cards).toHaveLength(2);
    expect(state.score).toBe(30);
  });

  it("Easyでは役成立後に2手の無料猶予を与える", () => {
    let state = forceVisible(initialGame(puzzle("easy")), [0, 1, 2, 3]);
    state = takeCard(state, 0);
    state = forceVisible(state, [1, 2, 3]);
    state = takeCard(state, 1);

    expect(state.pendingRoles).toHaveLength(0);
    expect(state.graceTurnsRemaining).toBe(2);
  });

  it("ワンペア破棄後も別ランクのワンペアは残る", () => {
    const p = puzzle("hard");
    p.cardsLayout[2] = createCard("♠", "4");
    p.cardsLayout[3] = createCard("♥", "4");
    let state = forceVisible(initialGame(p), [0, 1, 2, 3]);
    state = takeCard(state, 0);
    state = forceVisible(state, [1, 2, 3]);
    state = takeCard(state, 1);
    const pair3 = state.pendingRoles.find((role) => role.discardKey === "onePair:3")!;
    state = discardRole(state, pair3.key);
    expect(state.discardedRoleKeys.has("onePair:3")).toBe(true);
    expect(state.pendingRoles).toHaveLength(0);

    state = { ...state, pendingRoles: [] };
    state = forceVisible(state, [2, 3]);
    state = takeCard(state, 2);
    state = forceVisible(state, [3]);
    state = takeCard(state, 3);
    expect(state.pendingRoles.some((role) => role.discardKey === "onePair:4")).toBe(true);
  });
});
