import { describe, expect, it } from "vitest";
import {
  applyCandidate,
  applyRoute,
  cellEdges,
  cycleEdge,
  horizontalEdge,
  initialSlitherlink,
  isComplete,
  revealUnusedEdge,
  routeCandidates,
  surroundingCandidates,
  type SlitherlinkPuzzle,
} from "../domain/slitherlink";
const puzzle: SlitherlinkPuzzle = {
  id: "test",
  title: "test",
  difficulty: "easy",
  width: 2,
  height: 2,
  clues: [2, 2, 2, 2],
  solutionEdges: [
    "h:0:0",
    "h:0:1",
    "h:2:0",
    "h:2:1",
    "v:0:0",
    "v:1:0",
    "v:0:2",
    "v:1:2",
  ],
};
describe("slitherlink", () => {
  it("recognizes a single completed loop", () => {
    let state = initialSlitherlink(puzzle);
    for (const edge of puzzle.solutionEdges)
      state = { ...state, edges: { ...state.edges, [edge]: "line" } };
    expect(isComplete(puzzle, state)).toBe(true);
  });
  it("cycles an edge without candidate overwriting it", () => {
    const state = cycleEdge(initialSlitherlink(puzzle), horizontalEdge(0, 0)),
      candidates = surroundingCandidates(puzzle, state, 0, true);
    expect(candidates.length).toBeGreaterThan(0);
    expect(
      candidates.every(
        (candidate) => candidate[horizontalEdge(0, 0)] === "line",
      ),
    ).toBe(true);
    expect(
      applyCandidate(state, candidates[0]).edges[horizontalEdge(0, 0)],
    ).toBe("line");
  });
  it("offers six raw combinations around a two clue", () =>
    expect(
      surroundingCandidates(puzzle, initialSlitherlink(puzzle), 0, false),
    ).toHaveLength(6));
  it("finds and applies shortest routes through ordered points", () => {
    const state = initialSlitherlink(puzzle),
      routes = routeCandidates(puzzle, state, ["0:0", "1:1", "2:2"], false);
    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0]).toHaveLength(4);
    expect(
      Object.values(applyRoute(state, routes[0]).edges).filter(
        (value) => value === "line",
      ),
    ).toHaveLength(4);
  });
  it("uses a hint only for an unnecessary edge", () => {
    const state = initialSlitherlink(puzzle),
      needed = puzzle.solutionEdges[0],
      unused = cellEdges(puzzle, 0).find(
        (edge) => !puzzle.solutionEdges.includes(edge),
      )!,
      unchanged = revealUnusedEdge(puzzle, state, needed),
      hinted = revealUnusedEdge(puzzle, state, unused);
    expect(unchanged).toBe(state);
    expect(hinted.edges[unused]).toBe("cross");
    expect(hinted.hintCount).toBe(1);
  });
});
