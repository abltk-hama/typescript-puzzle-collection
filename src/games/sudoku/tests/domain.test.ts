import { describe, expect, it } from "vitest";
import {
  candidates,
  conflicts,
  enterNumber,
  initialSudoku,
  isComplete,
  lightHint,
  revealHint,
  selectCell,
  setMode,
  type SudokuPuzzle,
} from "../domain/sudoku";
const solution = [
  ..."534678912672195348198342567859761423426853791713924856961537284287419635345286179",
].map(Number);
const givens = [
  ..."530070000600195000098000060800060003400803001700020006060000280000419005000080079",
].map(Number);
const puzzle: SudokuPuzzle = {
  id: "one",
  title: "one",
  difficulty: "easy",
  givens,
  solution,
};
describe("Sudoku domain", () => {
  it("protects givens and detects conflicts", () => {
    let state: import("../domain/sudoku").SudokuState = selectCell(
      initialSudoku(puzzle),
      0,
    );
    expect(enterNumber(puzzle, state, 1)).toBe(state);
    state = selectCell(state, 2);
    state = enterNumber(puzzle, state, 5);
    expect(conflicts(state.values)).toEqual(new Set([0, 2]));
  });
  it("supports notes and removes related notes on entry", () => {
    let state = setMode(selectCell(initialSudoku(puzzle), 2), "note");
    state = enterNumber(puzzle, state, 4);
    expect(state.notes[2]).toEqual([4]);
    state = setMode(selectCell(state, 3), "value");
    state = enterNumber(puzzle, state, 4);
    expect(state.notes[2]).toEqual([]);
  });
  it("calculates candidates and only counts repeated light hint once", () => {
    const state = selectCell(initialSudoku(puzzle), 2),
      once = lightHint(state);
    expect(candidates(state.values, 2)).toEqual([1, 2, 4]);
    expect(lightHint(once).hintCount).toBe(1);
  });
  it("reveals and fixes a solution value", () => {
    const state = revealHint(puzzle, selectCell(initialSudoku(puzzle), 2), 2);
    expect(state.values[2]).toBe(4);
    expect(state.hinted).toEqual([2]);
    expect(state.hintCount).toBe(1);
  });
  it("accepts contradiction-free completion", () => {
    expect(isComplete({ ...initialSudoku(puzzle), values: solution })).toBe(
      true,
    );
  });
});
