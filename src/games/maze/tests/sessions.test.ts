import { beforeEach, expect, it } from "vitest";
import { deleteDB } from "idb";
import { generateMaze } from "../generation/generate";
import { initialGame, moveTo, nextHint } from "../domain/maze";
import {
  loadGeneratedPuzzles,
  loadMazeSession,
  saveMazeSession,
} from "../data/sessions";
beforeEach(async () => deleteDB("puzzle-collection"));
it("restores generated maze definition and progress", async () => {
  const puzzle = generateMaze(8, "small");
  let state = moveTo(puzzle, initialGame(puzzle), puzzle.answerPath[1]);
  state = nextHint(puzzle, state);
  await saveMazeSession(puzzle, state);
  expect(await loadMazeSession(puzzle)).toEqual(state);
  expect((await loadGeneratedPuzzles())[0]).toEqual(puzzle);
});
