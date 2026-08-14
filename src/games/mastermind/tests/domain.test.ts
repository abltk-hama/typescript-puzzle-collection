import { describe, expect, it } from "vitest";
import {
  attentionGroups,
  candidateCount,
  classifyGuess,
  consistentCandidates,
  guessComparisons,
  initialGame,
  inputConsistency,
  isWon,
  levelOneColors,
  logicalAnalysis,
  revealPosition,
  scoreGuess,
  setSymbol,
  submitGuess,
  togglePositionNote,
  addGuessColorsToNotes,
  organizeNotesFromSelection,
  replaceNotesFromSelection,
  selectedLogicalAnalysis,
  type MastermindPuzzle,
} from "../domain/mastermind";
import { generateMastermind } from "../generation/generate";
const puzzle: MastermindPuzzle = {
  id: "test",
  title: "Test",
  difficulty: "medium",
  codeLength: 4,
  symbolCount: 6,
  allowDuplicates: true,
  maxAttempts: 10,
  secret: [1, 1, 2, 3],
  metadata: {},
};
describe("Mastermind domain", () => {
  it("scores duplicates without double counting", () =>
    expect(scoreGuess([1, 1, 2, 3], [1, 2, 1, 1])).toEqual([1, 2]));
  it("submits a winning guess", () => {
    let state = initialGame(puzzle);
    [1, 1, 2, 3].forEach((value) => (state = setSymbol(puzzle, state, value)));
    state = submitGuess(puzzle, state);
    expect(isWon(puzzle, state)).toBe(true);
  });
  it("counts a candidate hint once for the same state", () => {
    const first = candidateCount(puzzle, initialGame(puzzle)),
      second = candidateCount(puzzle, first.state);
    expect(first.count).toBe(1296);
    expect(first.state.hintCount).toBe(1);
    expect(second.counted).toBe(false);
    expect(second.state.hintCount).toBe(1);
  });
  it("reveals and locks a correct position", () => {
    const state = revealPosition(puzzle, initialGame(puzzle), 0);
    expect(state.revealed[0]).toBe(1);
    expect(state.current[0]).toBe(1);
  });
  it("stores position notes separately from machine analysis", () => {
    const state = togglePositionNote(puzzle, initialGame(puzzle), 0, 2);
    expect(state.positionNotes[0]).toEqual([2]);
    expect(togglePositionNote(puzzle, state, 0, 2).positionNotes[0]).toEqual(
      [],
    );
  });
  it("classifies and compares history without claiming certainty", () => {
    const state = {
      ...initialGame(puzzle),
      guesses: [
        { code: [1, 2, 3, 4], exact: 1, misplaced: 1 },
        { code: [1, 5, 3, 4], exact: 2, misplaced: 0 },
        { code: [6, 6, 6, 6], exact: 0, misplaced: 0 },
      ],
    };
    expect(classifyGuess(state.guesses[0])).toBe("both");
    expect(levelOneColors(state).excluded).toEqual(new Set([6]));
    expect(guessComparisons(state)[0]).toMatchObject({
      changed: [1],
      exactDelta: 1,
    });
    expect(attentionGroups(puzzle, state).positions[1].size).toBeGreaterThan(0);
  });
  it("derives logical candidates only from feedback history", () => {
    const state = {
      ...initialGame(puzzle),
      guesses: [{ code: [1, 1, 2, 3], exact: 4, misplaced: 0 }],
    };
    expect(consistentCandidates(puzzle, state)).toEqual([[1, 1, 2, 3]]);
    expect(logicalAnalysis(puzzle, state).positionColors).toEqual([
      [1],
      [1],
      [2],
      [3],
    ]);
  });
  it("narrows position notes from at most three selected histories", () => {
    const state = {
      ...initialGame(puzzle),
      guesses: [
        { code: [1, 2, 5, 6], exact: 1, misplaced: 1 },
        { code: [1, 2, 3, 3], exact: 2, misplaced: 1 },
        { code: [1, 4, 2, 3], exact: 3, misplaced: 0 },
      ],
    };
    expect(
      selectedLogicalAnalysis(puzzle, state, [1, 2]).positionColors,
    ).toEqual([[1], [1, 5, 6], [2], [3]]);
    const noted = addGuessColorsToNotes(puzzle, state, 0);
    expect(noted.positionNotes[0]).toEqual([1, 2, 5, 6]);
    const organized = organizeNotesFromSelection(puzzle, noted, [0, 1, 2]);
    expect(organized.analysis.candidates).toEqual([[1, 1, 2, 3]]);
    expect(organized.state.positionNotes).toEqual([[1], [1], [2], []]);
  });
  it("counts replacing notes once for the same selected analysis", () => {
    const state = {
      ...initialGame(puzzle),
      guesses: [{ code: [1, 1, 2, 3], exact: 4, misplaced: 0 }],
    };
    const first = replaceNotesFromSelection(puzzle, state, [0]),
      second = replaceNotesFromSelection(puzzle, first.state, [0]);
    expect(first.state.positionNotes).toEqual([[1], [1], [2], [3]]);
    expect(first.state.hintCount).toBe(1);
    expect(second.counted).toBe(false);
    expect(second.state.hintCount).toBe(1);
  });
  it("warns when current input contradicts a prior score", () => {
    const state = {
      ...initialGame(puzzle),
      current: [6, 6, 6, 6],
      guesses: [{ code: [1, 1, 2, 3], exact: 4, misplaced: 0 }],
    };
    expect(inputConsistency(state).conflicts).toEqual([0]);
  });
  it("generates reproducibly and respects easy uniqueness", () => {
    const generated = generateMastermind(42, "easy");
    expect(generateMastermind(42, "easy")).toEqual(generated);
    expect(new Set(generated.secret).size).toBe(4);
  });
});
