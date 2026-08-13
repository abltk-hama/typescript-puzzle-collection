import { describe, expect, it } from "vitest";
import { parsePuzzles } from "../data/puzzles";
import { generateMaze } from "../generation/generate";
import { pathCodes } from "../domain/maze";
function raw() {
  const puzzle = generateMaze(7, "small");
  return {
    schema_version: 1,
    game_type: "maze",
    puzzles: [
      {
        id: "one",
        title: "One",
        difficulty: "easy",
        problem: {
          width: 9,
          height: 9,
          start: [0, 0],
          goal: [8, 8],
          passages: Array.from({ length: 9 }, (_, row) =>
            puzzle.passages
              .slice(row * 9, row * 9 + 9)
              .map((value) => value.toString(16))
              .join(""),
          ),
        },
        answer: { solution_moves: pathCodes(puzzle.answerPath) },
        metadata: {},
      },
    ],
  };
}
describe("maze parser", () => {
  it("accepts the Python v1 contract", () =>
    expect(parsePuzzles(raw())[0].passages).toHaveLength(81));
  it("rejects a non-reciprocal passage", () => {
    const data = raw();
    data.puzzles[0].problem.passages[0] =
      "f" + data.puzzles[0].problem.passages[0].slice(1);
    expect(() => parsePuzzles(data)).toThrow();
  });
  it("rejects an incorrect answer path", () => {
    const data = raw();
    data.puzzles[0].answer.solution_moves = "R";
    expect(() => parsePuzzles(data)).toThrow();
  });
});
