import { expect, it } from "vitest";
import { countSolutions } from "../domain/solver";
import { generateSlitherlink } from "../generation/generate";
it.each([5, 7, 10] as const)(
  "generates a unique %sx%s puzzle",
  (size) => {
    const puzzle = generateSlitherlink(4100 + size, size);
    expect(puzzle.width).toBe(size);
    expect(puzzle.clues.some((clue) => clue === null)).toBe(true);
    const result = countSolutions(puzzle, 2, size === 10 ? 300000 : 150000);
    expect(result.aborted).toBe(false);
    expect(result.count).toBe(1);
  },
  60000,
);
