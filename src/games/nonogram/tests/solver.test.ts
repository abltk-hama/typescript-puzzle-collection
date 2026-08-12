import { describe, expect, it } from "vitest";
import { generateNonogram } from "../generation/generate";
import { linePatterns, solveNonogram } from "../domain/solver";
describe("Nonogram solver and generator", () => {
  it("enumerates line patterns", () =>
    expect(linePatterns(5, [2]).length).toBe(4));
  it("detects a unique puzzle", () =>
    expect(
      solveNonogram([[1], [1], [5], [1], [1]], [[1], [1], [5], [1], [1]])
        .status,
    ).toBe("unique"));
  it("generates reproducible unique puzzles", () => {
    const first = generateNonogram(12345, 5, "easy"),
      second = generateNonogram(12345, 5, "easy");
    expect(first.solution).toEqual(second.solution);
    expect(solveNonogram(first.rowClues, first.columnClues).status).toBe(
      "unique",
    );
  });
});
