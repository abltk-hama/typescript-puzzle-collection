import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { applyStroke, cluesForSolution, initialNonogram, type NonogramPuzzle } from "../domain/nonogram";
import { loadNonogramSession, saveNonogramSession } from "../data/sessions";
import { saveSession } from "../../../common/storage/database";

const solution = [..."0010000100111110010000100"].map((value) => value === "1"),
  clues = cluesForSolution(solution, 5, 5),
  puzzle: NonogramPuzzle = { id: "session-cross", title: "十字", difficulty: "easy", width: 5, height: 5, rowClues: clues.rows, columnClues: clues.columns, solution };

describe("Nonogram sessions", () => {
  it("round trips stroke history", async () => {
    const state = applyStroke(puzzle, initialNonogram(puzzle), [0, 1], 2);
    await saveNonogramSession(puzzle, state);
    expect(await loadNonogramSession(puzzle)).toEqual(state);
  });
  it("rejects inconsistent history", async () => {
    const state = { ...initialNonogram(puzzle), cells: [1, ...Array(24).fill(0)] };
    await saveSession({ gameId: "nonogram", puzzleId: puzzle.id, schemaVersion: 1, state, updatedAt: new Date().toISOString() });
    expect(await loadNonogramSession(puzzle)).toBeUndefined();
  });
});
