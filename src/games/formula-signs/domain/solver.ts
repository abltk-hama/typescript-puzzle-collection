import {
  analyzeFormula,
  initialFormula,
  isComplete,
  type FormulaPuzzle,
  type Operator,
} from "./formulaSigns";
export function countSolutions(puzzle: FormulaPuzzle, limit = 2) {
  let count = 0;
  const initial = initialFormula(puzzle);
  function search(numbers: number[], operators: (Operator | null)[]) {
    if (count >= limit) return;
    const a = analyzeFormula(
      puzzle,
      numbers,
      operators,
      initial.numberNotes,
      initial.operatorNotes,
    );
    if (a.contradictionExpressionId) return;
    const variables = [
      ...a.numberCandidates.map((items, index) => ({
        kind: "number" as const,
        index,
        items,
      })),
      ...a.operatorCandidates.map((items, index) => ({
        kind: "operator" as const,
        index,
        items,
      })),
    ]
      .filter((x) => x.items.length)
      .sort((x, y) => x.items.length - y.items.length);
    if (!variables.length) {
      if (isComplete(puzzle, { ...initial, numbers, operators })) count++;
      return;
    }
    const selected = variables[0];
    for (const value of selected.items) {
      const n = [...numbers],
        o = [...operators];
      if (selected.kind === "number") n[selected.index] = value as number;
      else o[selected.index] = value as Operator;
      search(n, o);
    }
  }
  search([...puzzle.numberGivens], [...puzzle.operatorGivens]);
  return count;
}
