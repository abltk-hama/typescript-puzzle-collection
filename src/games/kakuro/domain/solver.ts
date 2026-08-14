import {
  analyzeDomains,
  buildRuns,
  initialKakuro,
  isComplete,
  type KakuroPuzzle,
} from "./kakuro";

export function countSolutions(
  puzzle: KakuroPuzzle,
  seed = puzzle.givens,
  limit = 2,
) {
  let count = 0;
  const notes = Array.from(
    { length: puzzle.white.length },
    () => [] as number[],
  );
  function search(values: number[]) {
    if (count >= limit) return;
    const analysis = analyzeDomains(puzzle, values, notes, true);
    if (analysis.contradictionRunId) return;
    let target = -1,
      choices: number[] = [];
    puzzle.white.forEach((white, index) => {
      if (
        white &&
        !values[index] &&
        (target < 0 || analysis.cellCandidates[index].length < choices.length)
      ) {
        target = index;
        choices = analysis.cellCandidates[index];
      }
    });
    if (target < 0) {
      if (isComplete(puzzle, { ...initialKakuro(puzzle), values })) count++;
      return;
    }
    for (const value of choices) {
      const next = [...values];
      next[target] = value;
      search(next);
    }
  }
  search([...seed]);
  return count;
}

export function solveKakuro(puzzle: KakuroPuzzle) {
  let result: number[] | null = null;
  const notes = Array.from(
    { length: puzzle.white.length },
    () => [] as number[],
  );
  function search(values: number[]): boolean {
    const analysis = analyzeDomains(puzzle, values, notes, true);
    if (analysis.contradictionRunId) return false;
    const empty = puzzle.white
      .map((white, index) => ({
        index,
        items: analysis.cellCandidates[index],
        white,
      }))
      .filter((item) => item.white && !values[item.index])
      .sort((a, b) => a.items.length - b.items.length)[0];
    if (!empty) {
      result = values;
      return true;
    }
    for (const value of empty.items) {
      const next = [...values];
      next[empty.index] = value;
      if (search(next)) return true;
    }
    return false;
  }
  search([...puzzle.givens]);
  return result;
}

export function isPropagationSolvable(puzzle: KakuroPuzzle) {
  const values = [...puzzle.givens],
    notes = Array.from({ length: values.length }, () => [] as number[]);
  while (true) {
    const analysis = analyzeDomains(puzzle, values, notes, true);
    if (analysis.contradictionRunId) return false;
    const forced = analysis.forced.filter((item) => !values[item.index]);
    if (!forced.length) break;
    forced.forEach((item) => (values[item.index] = item.value));
  }
  return buildRuns(puzzle).every((run) =>
    run.cells.every((index) => values[index]),
  );
}
