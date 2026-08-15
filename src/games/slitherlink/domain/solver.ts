import {
  allEdges,
  cellEdges,
  edgeVertices,
  initialSlitherlink,
  isComplete,
  type EdgeStatus,
  type SlitherlinkPuzzle,
} from "./slitherlink";
export interface SolutionCount {
  count: number;
  aborted: boolean;
  nodes: number;
}
export function countSolutions(
  puzzle: SlitherlinkPuzzle,
  limit = 2,
  maxNodes = 150000,
): SolutionCount {
  const edges = allEdges(puzzle),
    edgeIndex = new Map(edges.map((edge, index) => [edge, index])),
    clues = puzzle.clues
      .map((clue, index) =>
        clue === null
          ? null
          : {
              value: clue,
              edges: cellEdges(puzzle, index).map(
                (edge) => edgeIndex.get(edge)!,
              ),
            },
      )
      .filter(
        (item): item is { value: number; edges: number[] } => item !== null,
      ),
    vertices = [...new Set(edges.flatMap(edgeVertices))].map((vertex) =>
      edges
        .map((edge, index) =>
          edgeVertices(edge).includes(vertex) ? index : -1,
        )
        .filter((index) => index >= 0),
    );
  let count = 0,
    nodes = 0,
    aborted = false;
  function assign(values: Int8Array, index: number, value: 0 | 1) {
    if (values[index] !== -1) return values[index] === value;
    values[index] = value;
    return true;
  }
  function propagate(values: Int8Array) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const clue of clues) {
        const line = clue.edges.filter((index) => values[index] === 1).length,
          unknown = clue.edges.filter((index) => values[index] === -1);
        if (line > clue.value || line + unknown.length < clue.value)
          return false;
        if (line === clue.value)
          for (const index of unknown) {
            if (!assign(values, index, 0)) return false;
            changed = true;
          }
        else if (line + unknown.length === clue.value)
          for (const index of unknown) {
            if (!assign(values, index, 1)) return false;
            changed = true;
          }
      }
      for (const incident of vertices) {
        const line = incident.filter((index) => values[index] === 1).length,
          unknown = incident.filter((index) => values[index] === -1);
        if (line > 2 || (line === 1 && !unknown.length)) return false;
        if (line === 2)
          for (const index of unknown) {
            if (!assign(values, index, 0)) return false;
            changed = true;
          }
        else if (line === 1 && unknown.length === 1) {
          if (!assign(values, unknown[0], 1)) return false;
          changed = true;
        } else if (line === 0 && unknown.length === 1) {
          if (!assign(values, unknown[0], 0)) return false;
          changed = true;
        }
      }
    }
    return true;
  }
  function search(values: Int8Array) {
    if (count >= limit || aborted) return;
    if (++nodes > maxNodes) {
      aborted = true;
      return;
    }
    if (!propagate(values)) return;
    let selected = -1,
      best = -1;
    for (let index = 0; index < values.length; index++)
      if (values[index] === -1) {
        const score =
          clues.filter((clue) => clue.edges.includes(index)).length * 4 +
          vertices.filter((vertex) => vertex.includes(index)).length;
        if (score > best) {
          best = score;
          selected = index;
        }
      }
    if (selected < 0) {
      const state = initialSlitherlink(puzzle);
      edges.forEach(
        (edge, index) =>
          (state.edges[edge] = (
            values[index] === 1 ? "line" : "cross"
          ) as EdgeStatus),
      );
      if (isComplete(puzzle, state)) count++;
      return;
    }
    for (const value of [1, 0] as const) {
      const next = values.slice();
      next[selected] = value;
      search(next);
    }
  }
  const initial = new Int8Array(edges.length);
  initial.fill(-1);
  search(initial);
  return { count, aborted, nodes };
}
