import { expect, it } from "vitest";
import { parsePuzzles } from "../data/puzzles";
it("parses a valid bundled-format puzzle", () => {
  const puzzle = parsePuzzles({
    schema_version: 1,
    game_type: "slitherlink",
    puzzles: [
      {
        id: "tiny",
        title: "tiny",
        difficulty: "easy",
        width: 2,
        height: 2,
        clues: [2, 2, 2, 2],
        solution_edges: [
          "h:0:0",
          "h:0:1",
          "h:2:0",
          "h:2:1",
          "v:0:0",
          "v:1:0",
          "v:0:2",
          "v:1:2",
        ],
      },
    ],
  })[0];
  expect(puzzle.clues).toHaveLength(4);
});
