import { describe, expect, it } from "vitest";
import {
  applyStroke,
  cluesForSolution,
  initialNonogram,
  isComplete,
  revealCell,
  undoStroke,
  type NonogramPuzzle,
} from "../domain/nonogram";
const solution = [...`0101011111111110111000100`].map((value) => value === "1"),
  clues = cluesForSolution(solution, 5, 5),
  puzzle: NonogramPuzzle = {
    id: "heart",
    title: "ハート",
    difficulty: "easy",
    width: 5,
    height: 5,
    rowClues: clues.rows,
    columnClues: clues.columns,
    solution,
  };
describe("Nonogram domain", () => {
  it("calculates clues", () =>
    expect(clues.rows).toEqual([[1, 1], [5], [5], [3], [1]]));
  it("applies and undoes a stroke as one unit", () => {
    let state = applyStroke(puzzle, initialNonogram(puzzle), [0, 1, 2], 1);
    expect(state.history).toHaveLength(1);
    state = undoStroke(puzzle, state);
    expect(state.cells.every((value) => value === 0)).toBe(true);
  });
  it("rejects diagonal strokes", () =>
    expect(
      applyStroke(puzzle, initialNonogram(puzzle), [0, 6], 1).history,
    ).toHaveLength(0));
  it("locks hints outside undo history", () => {
    let state = revealCell(puzzle, initialNonogram(puzzle), 0);
    state = applyStroke(puzzle, state, [0, 1], 1);
    state = undoStroke(puzzle, state);
    expect(state.cells[0]).toBe(2);
    expect(state.hinted).toEqual([0]);
  });
  it("does not redirect a selected hint from an already correct cell", () => {
    const state = { ...initialNonogram(puzzle), cells: [2, ...Array(24).fill(0)] as (0 | 1 | 2)[] };
    expect(revealCell(puzzle, state, 0)).toBe(state);
  });
  it("completion only compares filled cells", () => {
    const cells = solution.map((value) => (value ? 1 : 0)) as (0 | 1 | 2)[];
    expect(isComplete(puzzle, { ...initialNonogram(puzzle), cells })).toBe(
      true,
    );
  });
});
