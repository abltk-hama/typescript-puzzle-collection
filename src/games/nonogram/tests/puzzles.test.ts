import { describe, expect, it } from "vitest";
import { parsePuzzles } from "../data/puzzles";
const item = {
  id: "cross",
  title: "十字",
  difficulty: "easy",
  problem: {
    width: 5,
    height: 5,
    row_clues: [[1], [1], [5], [1], [1]],
    column_clues: [[1], [1], [5], [1], [1]],
  },
  answer: { filled_cells: ["00100", "00100", "11111", "00100", "00100"] },
};
describe("Nonogram puzzle data", () => {
  it("accepts valid data", () =>
    expect(
      parsePuzzles({
        schema_version: 1,
        game_type: "nonogram",
        puzzles: [item],
      }),
    ).toHaveLength(1));
  it("rejects duplicate ids", () =>
    expect(() =>
      parsePuzzles({
        schema_version: 1,
        game_type: "nonogram",
        puzzles: [item, item],
      }),
    ).toThrow(/重複/));
  it("rejects mismatched clues", () =>
    expect(() =>
      parsePuzzles({
        schema_version: 1,
        game_type: "nonogram",
        puzzles: [
          {
            ...item,
            problem: { ...item.problem, row_clues: [[5], [1], [5], [1], [1]] },
          },
        ],
      }),
    ).toThrow(/不正/));
});
