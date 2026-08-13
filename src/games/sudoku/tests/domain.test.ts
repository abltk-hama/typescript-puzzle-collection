import { describe, expect, it } from "vitest";
import {
  candidates,
  applyLogicalHint,
  addCandidateNotes,
  cleanCandidateNotes,
  conflicts,
  enterNumber,
  findHiddenSingle,
  findLogicalHint,
  findNakedSingle,
  nearCompleteUnits,
  initialSudoku,
  isComplete,
  lightHint,
  revealHint,
  selectCell,
  setMode,
  type SudokuPuzzle,
  createCheckpoint,
  restoreCheckpoint,
  acceptCheckpoint,
  cleanIncorrectEntries,
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
  it("finds a naked single before other logical hints", () => {
    const values = [...solution];
    values[0] = 0;
    expect(findNakedSingle(values)).toMatchObject({
      index: 0,
      digit: 5,
      kind: "naked-single",
    });
    expect(findLogicalHint(values)?.kind).toBe("naked-single");
  });
  it("finds hidden singles in rows, columns, and blocks", () => {
    expect(findHiddenSingle(givens, "row")).toMatchObject({
      kind: "hidden-single-row",
    });
    expect(findHiddenSingle(givens, "column")).toMatchObject({
      kind: "hidden-single-column",
    });
    expect(findHiddenSingle(givens, "block")).toMatchObject({
      kind: "hidden-single-block",
    });
  });
  it("only counts the same logical hint once for an unchanged board", () => {
    const values = [...solution];
    values[0] = 0;
    const hint = findLogicalHint(values)!;
    const once = applyLogicalHint({ ...initialSudoku(puzzle), values }, hint);
    expect(once.selected).toBe(0);
    expect(applyLogicalHint(once, hint).hintCount).toBe(1);
  });
  it("detects valid and contradictory units with one empty cell", () => {
    const values = [...solution];
    values[8] = 0;
    expect(nearCompleteUnits(values)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "row",
          unitIndex: 0,
          emptyIndex: 8,
          missing: [2],
          valid: true,
        }),
        expect.objectContaining({
          kind: "column",
          unitIndex: 8,
          emptyIndex: 8,
          missing: [2],
          valid: true,
        }),
        expect.objectContaining({
          kind: "block",
          unitIndex: 2,
          emptyIndex: 8,
          missing: [2],
          valid: true,
        }),
      ]),
    );
    values[0] = 3;
    expect(
      nearCompleteUnits(values).find(
        (unit) => unit.kind === "row" && unit.unitIndex === 0,
      )?.valid,
    ).toBe(false);
  });
  it("adds candidates to the selected cell and cleans invalid notes", () => {
    const base = selectCell(initialSudoku(puzzle), 2),
      noted = addCandidateNotes(base);
    expect(noted.notes[2]).toEqual([1, 2, 4]);
    const dirty = {
        ...noted,
        notes: noted.notes.map((list, index) =>
          index === 2 ? [...list, 5] : list,
        ),
      },
      cleaned = cleanCandidateNotes(dirty);
    expect(cleaned.removed).toBe(1);
    expect(cleaned.state.notes[2]).toEqual([1, 2, 4]);
  });
  it("creates nested checkpoints and restores only the newest one", () => {
    let state = createCheckpoint(initialSudoku(puzzle));
    state = enterNumber(puzzle, selectCell(state, 2), 4);
    state = createCheckpoint(state);
    state = enterNumber(puzzle, selectCell(state, 3), 6);
    state = { ...state, hintCount: 2 };
    const restored = restoreCheckpoint(state);
    expect(restored.values[2]).toBe(4);
    expect(restored.values[3]).toBe(0);
    expect(restored.hintCount).toBe(2);
    expect(restored.checkpoints).toHaveLength(1);
    expect(acceptCheckpoint(restored).checkpoints).toHaveLength(0);
  });
  it("keeps correct entries and untouched empty-cell notes when cleaning errors", () => {
    let state = initialSudoku(puzzle);
    const notes = state.notes.map((list) => [...list]);
    notes[2] = [1, 4];
    notes[3] = [2, 6];
    state = {
      ...state,
      values: state.values.map((value, index) =>
        index === 2 ? 9 : index === 3 ? 6 : value,
      ),
      notes,
      checkpoints: createCheckpoint(state).checkpoints,
    };
    const cleaned = cleanIncorrectEntries(puzzle, state);
    expect(cleaned.removed).toBe(1);
    expect(cleaned.state.values[2]).toBe(0);
    expect(cleaned.state.notes[2]).toEqual([]);
    expect(cleaned.state.values[3]).toBe(6);
    expect(cleaned.state.notes[3]).toEqual([2, 6]);
    expect(cleaned.state.checkpoints).toEqual([]);
    expect(cleaned.state.hintCount).toBe(1);
  });
});
