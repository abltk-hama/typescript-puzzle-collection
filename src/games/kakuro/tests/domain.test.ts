import { describe, expect, it } from "vitest";
import {
  analyzeDomains,
  applyHypothesisSequence,
  buildRuns,
  initialKakuro,
  isComplete,
  runSequences,
  startHypothesis,
  type KakuroPuzzle,
} from "../domain/kakuro";
const puzzle: KakuroPuzzle = {
  id: "test",
  title: "test",
  difficulty: "easy",
  width: 5,
  height: 5,
  white: [
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    true,
    true,
    false,
    false,
    true,
    true,
    true,
    false,
    false,
    true,
    true,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
  ],
  clues: [
    { index: 1, down: 12 },
    { index: 2, down: 15 },
    { index: 3, down: 18 },
    { index: 5, right: 6 },
    { index: 10, right: 15 },
    { index: 15, right: 24 },
  ],
  givens: Array(25).fill(0),
  solution: [
    0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 4, 5, 6, 0, 0, 7, 8, 9, 0, 0, 0, 0, 0, 0,
  ],
};
describe("kakuro domain", () => {
  it("enumerates distinct digit sequences", () => {
    expect(runSequences(2, 3)).toEqual([
      [1, 2],
      [2, 1],
    ]);
  });
  it("builds crossing runs and accepts a completed board", () => {
    expect(buildRuns(puzzle)).toHaveLength(6);
    expect(
      isComplete(puzzle, { ...initialKakuro(puzzle), values: puzzle.solution }),
    ).toBe(true);
  });
  it("propagates candidates and supports hypothesis sequence undo history", () => {
    const state = startHypothesis(initialKakuro(puzzle)),
      run = buildRuns(puzzle).find((item) => item.direction === "right")!,
      next = applyHypothesisSequence(puzzle, state, run.id, [1, 2, 3]);
    expect(next.hypothesis?.history).toHaveLength(1);
    expect(
      analyzeDomains(puzzle, working(next), next.notes).contradictionRunId,
    ).toBeNull();
  });
});
function working(state: ReturnType<typeof initialKakuro>) {
  return state.values.map(
    (value, index) => value || state.hypothesis?.trialValues[index] || 0,
  );
}
