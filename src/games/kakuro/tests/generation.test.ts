import { describe, expect, it } from "vitest";
import { initialKakuro, isComplete } from "../domain/kakuro";
import { countSolutions } from "../domain/solver";
import { generateKakuro } from "../generation/generate";
describe("kakuro generation", () => {
  it.each([5, 7] as const)("generates a unique valid %sx%s puzzle", (size) => {
    const puzzle = generateKakuro(1234, size);
    expect(countSolutions(puzzle)).toBe(1);
    expect(
      isComplete(puzzle, { ...initialKakuro(puzzle), values: puzzle.solution }),
    ).toBe(true);
  });
});
