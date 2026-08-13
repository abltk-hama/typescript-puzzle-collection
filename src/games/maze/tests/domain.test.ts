import { describe, expect, it } from "vitest";
import {
  applyPath,
  beginPreview,
  initialGame,
  isComplete,
  moveTo,
  nextHint,
  segmentOptions,
  solutionPath,
  undo,
  type MazePuzzle,
} from "../domain/maze";
import { generateMaze } from "../generation/generate";
const puzzle: MazePuzzle = {
  id: "test",
  title: "Test",
  difficulty: "easy",
  width: 9,
  height: 9,
  passages: Array(81).fill(0),
  start: { row: 0, column: 0 },
  goal: { row: 0, column: 2 },
  answerPath: [
    { row: 0, column: 0 },
    { row: 0, column: 1 },
    { row: 0, column: 2 },
  ],
  metadata: {},
};
puzzle.passages[0] = 2;
puzzle.passages[1] = 10;
puzzle.passages[2] = 8;
describe("maze domain", () => {
  it("finds and follows a route", () => {
    expect(solutionPath(puzzle, puzzle.start, puzzle.goal)).toEqual(
      puzzle.answerPath,
    );
    let state = moveTo(puzzle, initialGame(puzzle), { row: 0, column: 1 });
    state = moveTo(puzzle, state, { row: 0, column: 2 });
    expect(isComplete(puzzle, state)).toBe(true);
  });
  it("rejects wall crossing and supports undo", () => {
    const start = initialGame(puzzle);
    expect(moveTo(puzzle, start, { row: 1, column: 0 })).toBe(start);
    expect(undo(moveTo(puzzle, start, { row: 0, column: 1 }))).toEqual(start);
  });
  it("counts a stable next-cell hint once", () => {
    const first = nextHint(puzzle, initialGame(puzzle));
    expect(first.hintPosition).toEqual({ row: 0, column: 1 });
    expect(first.hintCount).toBe(1);
    expect(nextHint(puzzle, first)).toBe(first);
  });
  it("previews and applies a corridor segment as atomic moves", () => {
    const option = segmentOptions(puzzle, puzzle.start)[0];
    expect(option.path).toEqual([
      { row: 0, column: 1 },
      { row: 0, column: 2 },
    ]);
    const previewed = beginPreview(initialGame(puzzle));
    expect(previewed.trialCount).toBe(1);
    const moved = applyPath(puzzle, previewed, option.path);
    expect(moved.history).toHaveLength(3);
    expect(isComplete(puzzle, moved)).toBe(true);
  });
  it("generates connected reproducible mazes through 31 square", () => {
    for (const profile of ["small", "medium", "large", "extraLarge"] as const) {
      const generated = generateMaze(42, profile);
      expect(generateMaze(42, profile)).toEqual(generated);
      expect(generated.answerPath.length).toBeGreaterThan(1);
      expect(generated.passages).toHaveLength(
        generated.width * generated.height,
      );
    }
  });
});
