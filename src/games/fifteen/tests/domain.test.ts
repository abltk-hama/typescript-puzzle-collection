import { describe, expect, it } from "vitest";
import {
  GOAL,
  alignedMoveTiles,
  initialGame,
  isComplete,
  move,
  moveEmpty,
  moveLine,
  movableTiles,
  nextHint,
  undo,
  applyMoves,
  rectangleFromCorners,
  rectanglePerimeter,
  rotationMoves,
  emptyNavigationPaths,
  type FifteenPuzzle,
} from "../domain/fifteen";
import { generateFifteen } from "../generation/generate";
const puzzle: FifteenPuzzle = {
  id: "test",
  title: "Test",
  difficulty: "easy",
  initialTiles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15],
  knownSolution: [15],
  metadata: {},
};
describe("15 puzzle domain", () => {
  it("moves only a tile adjacent to the empty cell", () => {
    const state = initialGame(puzzle);
    expect(move(state, 15).tiles).toEqual(GOAL);
    expect(move(state, 1)).toBe(state);
  });
  it("supports empty-cell arrow movement and undo", () => {
    const state = initialGame(puzzle),
      moved = moveEmpty(state, 0, 1);
    expect(isComplete(moved)).toBe(true);
    expect(undo(moved)).toEqual(state);
  });
  it("finds movable tiles around the empty cell", () =>
    expect(movableTiles(puzzle.initialTiles)).toEqual([11, 14, 15]));
  it("slides an aligned row as atomic moves and undoes one tile", () => {
    const wide = {
        ...puzzle,
        initialTiles: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 13, 14, 15],
      },
      start = initialGame(wide);
    expect(alignedMoveTiles(start.tiles, 15)).toEqual([13, 14, 15]);
    const moved = moveLine(start, 15);
    expect(moved.history).toEqual([13, 14, 15]);
    expect(moved.tiles).toEqual(GOAL);
    expect(undo(moved).history).toEqual([13, 14]);
  });
  it("rejects a line slide from a different row and column", () => {
    const state = initialGame(puzzle);
    expect(alignedMoveTiles(state.tiles, 1)).toEqual([]);
    expect(moveLine(state, 1)).toBe(state);
  });
  it("rotates a rectangle perimeter through legal atomic moves", () => {
    const rectangle = rectangleFromCorners(10, 15)!;
    expect(rectanglePerimeter(rectangle)).toEqual([10, 11, 15, 14]);
    const moves = rotationMoves(
      puzzle.initialTiles,
      rectangle,
      "clockwise",
      "corner",
    );
    expect(moves).toEqual([11]);
    const rotated = applyMoves(initialGame(puzzle), moves);
    expect(rotated.history).toEqual(moves);
    expect(rotated.tiles.indexOf(0)).toBe(10);
    const lap = rotationMoves(
        puzzle.initialTiles,
        rectangle,
        "clockwise",
        "lap",
      ),
      lapped = applyMoves(initialGame(puzzle), lap);
    expect(lap).toHaveLength(rectanglePerimeter(rectangle).length);
    expect(lapped.history).toEqual(lap);
    expect(lapped.tiles.indexOf(0)).toBe(14);
  });
  it("lists empty-cell navigation paths up to the chosen depth", () => {
    const paths = emptyNavigationPaths(puzzle.initialTiles, 2);
    expect(
      paths.some((path) => path.target === 15 && path.moves.length === 1),
    ).toBe(true);
    expect(paths.every((path) => path.moves.length <= 2)).toBe(true);
  });
  it("returns a stable known-route hint", () => {
    const first = nextHint(puzzle, initialGame(puzzle));
    expect(first.hintTile).toBe(15);
    expect(first.hintCount).toBe(1);
    expect(nextHint(puzzle, first)).toBe(first);
  });
  it("routes back through off-route player moves", () => {
    const moved = move(initialGame(puzzle), 14),
      hint = nextHint(puzzle, moved);
    expect(hint.hintTile).toBe(14);
    expect(move(hint, 14).hintRoute).toEqual([15]);
  });
  it("generates reproducible solvable boards for every profile", () => {
    for (const profile of ["easy", "medium", "hard"] as const) {
      const generated = generateFifteen(42, profile);
      expect(generateFifteen(42, profile)).toEqual(generated);
      let state = initialGame(generated);
      for (const tile of generated.knownSolution) state = move(state, tile);
      expect(isComplete(state)).toBe(true);
    }
  });
});
