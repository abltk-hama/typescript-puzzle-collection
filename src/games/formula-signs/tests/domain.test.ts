import { describe, expect, it } from "vitest";
import {
  analyzeFormula,
  evaluateExpression,
  initialFormula,
  isComplete,
} from "../domain/formulaSigns";
import { countSolutions } from "../domain/solver";
import { generateFormulaSigns } from "../generation/generate";
import { calculationBasis } from "../ui/verificationBasis";
describe("formula signs", () => {
  it("uses normal multiplication precedence", () =>
    expect(evaluateExpression([2, 3, 5], ["+", "*"])).toBe(17));
  it.each(["easy", "medium", "hard", "challenge"] as const)(
    "generates a unique %s puzzle",
    (difficulty) => {
      const puzzle = generateFormulaSigns(1234, difficulty),
        solved = {
          ...initialFormula(puzzle),
          numbers: puzzle.numberSolution,
          operators: puzzle.operatorSolution,
        };
      expect(countSolutions(puzzle)).toBe(1);
      expect(isComplete(puzzle, solved)).toBe(true);
      if (difficulty === "challenge")
        expect(
          puzzle.numberGivens.filter(
            (value, index) => puzzle.cells[index] === "number" && !value,
          ).length,
        ).toBeGreaterThan(0);
      if (difficulty === "hard") {
        expect(
          puzzle.cells.some(
            (kind, index) =>
              kind === "operator" &&
              puzzle.expressions.filter((e) => e.cells.includes(index))
                .length === 2,
          ),
        ).toBe(true);
        expect(puzzle.operatorGivens.filter(Boolean).length).toBeGreaterThan(0);
      }
      if (difficulty === "challenge")
        expect(puzzle.operatorGivens.filter(Boolean)).toHaveLength(0);
    },
  );
  it("finds candidates across shared expressions", () => {
    const puzzle = generateFormulaSigns(99, "hard"),
      state = initialFormula(puzzle),
      analysis = analyzeFormula(
        puzzle,
        state.numbers,
        state.operators,
        state.numberNotes,
        state.operatorNotes,
      );
    expect(analysis.contradictionExpressionId).toBeNull();
    expect(analysis.operatorCandidates.some((items) => items.length)).toBe(
      true,
    );
  });
  it.each([7, 9] as const)("generates a unique shared %sx%s puzzle", (size) => {
    const puzzle = generateFormulaSigns(4321, "hard", size);
    expect(puzzle.width).toBe(size);
    expect(countSolutions(puzzle)).toBe(1);
  });
  it("generates a 9x9 challenge with hidden numbers", () => {
    const puzzle = generateFormulaSigns(5678, "challenge", 9);
    expect(puzzle.width).toBe(9);
    expect(
      puzzle.numberGivens.some(
        (value, index) => puzzle.cells[index] === "number" && !value,
      ),
    ).toBe(true);
    expect(countSolutions(puzzle)).toBe(1);
  });
  it("precomputes safe fixed trailing terms for verification", () => {
    const cells = [0, 1, 2, 3, 4, 5, 6],
      numbers = [4, 0, 7, 0, 9, 0, 8];
    expect(
      calculationBasis(cells, 260, numbers, [null, null, null, null, null, "+", null]),
    ).toMatchObject({ target: 252, cells: [0, 1, 2, 3, 4] });
    expect(
      calculationBasis(cells, 260, numbers, [null, null, null, "+", null, "*", null]),
    ).toMatchObject({ target: 188, cells: [0, 1, 2] });
  });
});
