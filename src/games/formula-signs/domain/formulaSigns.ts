export type FormulaDifficulty = "easy" | "medium" | "hard" | "challenge";
export type Operator = "+" | "-" | "*";
export type CellKind = "block" | "number" | "operator";
export interface FormulaExpression {
  id: string;
  direction: "horizontal" | "vertical";
  cells: number[];
  target: number;
}
export interface FormulaPuzzle {
  id: string;
  title: string;
  difficulty: FormulaDifficulty;
  width: number;
  height: number;
  cells: CellKind[];
  expressions: FormulaExpression[];
  allowedOperators: Operator[];
  numberSolution: number[];
  operatorSolution: (Operator | null)[];
  numberGivens: number[];
  operatorGivens: (Operator | null)[];
  generated?: boolean;
}
export interface FormulaSnapshot {
  numbers: number[];
  operators: (Operator | null)[];
}
export interface FormulaHypothesis {
  numbers: number[];
  operators: (Operator | null)[];
  history: FormulaSnapshot[];
  selectedExpressionId: string | null;
}
export interface FormulaState {
  numbers: number[];
  operators: (Operator | null)[];
  numberNotes: number[][];
  operatorNotes: Operator[][];
  selected: number | null;
  hintCount: number;
  hinted: number[];
  hypothesis: FormulaHypothesis | null;
}
export interface ExpressionAssignment {
  numbers: Map<number, number>;
  operators: Map<number, Operator>;
}
export interface FormulaAnalysis {
  domains: Map<string, ExpressionAssignment[]>;
  numberCandidates: number[][];
  operatorCandidates: Operator[][];
  forcedNumbers: { index: number; value: number }[];
  forcedOperators: { index: number; value: Operator }[];
  contradictionExpressionId: string | null;
}
export function evaluateExpression(numbers: number[], operators: Operator[]) {
  let total = 0,
    term = numbers[0];
  for (let i = 0; i < operators.length; i++) {
    if (operators[i] === "*") term *= numbers[i + 1];
    else {
      total += term;
      term = operators[i] === "+" ? numbers[i + 1] : -numbers[i + 1];
    }
  }
  return total + term;
}
export function initialFormula(puzzle: FormulaPuzzle): FormulaState {
  return {
    numbers: [...puzzle.numberGivens],
    operators: [...puzzle.operatorGivens],
    numberNotes: Array.from({ length: puzzle.cells.length }, () => []),
    operatorNotes: Array.from({ length: puzzle.cells.length }, () => []),
    selected: null,
    hintCount: 0,
    hinted: [],
    hypothesis: null,
  };
}
export const workingNumbers = (state: FormulaState) =>
  state.numbers.map((v, i) => v || state.hypothesis?.numbers[i] || 0);
export const workingOperators = (state: FormulaState) =>
  state.operators.map((v, i) => v || state.hypothesis?.operators[i] || null);
export const expressionsForCell = (puzzle: FormulaPuzzle, index: number) =>
  puzzle.expressions.filter((expression) => expression.cells.includes(index));
function expressionDomain(
  puzzle: FormulaPuzzle,
  expression: FormulaExpression,
  numbers: number[],
  operators: (Operator | null)[],
  numberNotes: number[][],
  operatorNotes: Operator[][],
) {
  const numberCells = expression.cells.filter((_, i) => i % 2 === 0),
    operatorCells = expression.cells.filter((_, i) => i % 2 === 1),
    result: ExpressionAssignment[] = [];
  function fillNumbers(offset: number, values: number[], used: Set<number>) {
    if (offset === numberCells.length) {
      fillOperators(0, []);
      return;
    }
    const index = numberCells[offset],
      fixed = numbers[index],
      choices = fixed
        ? [fixed]
        : numberNotes[index].length
          ? numberNotes[index]
          : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const value of choices)
      if (!used.has(value)) {
        used.add(value);
        fillNumbers(offset + 1, [...values, value], used);
        used.delete(value);
      }
    function fillOperators(position: number, ops: Operator[]) {
      if (position === operatorCells.length) {
        if (evaluateExpression(values, ops) === expression.target)
          result.push({
            numbers: new Map(numberCells.map((cell, i) => [cell, values[i]])),
            operators: new Map(operatorCells.map((cell, i) => [cell, ops[i]])),
          });
        return;
      }
      const index = operatorCells[position],
        fixed = operators[index],
        choices = fixed
          ? [fixed]
          : operatorNotes[index].length
            ? operatorNotes[index]
            : puzzle.allowedOperators;
      for (const op of choices) fillOperators(position + 1, [...ops, op]);
    }
  }
  fillNumbers(0, [], new Set());
  return result;
}
export function analyzeFormula(
  puzzle: FormulaPuzzle,
  numbers: number[],
  operators: (Operator | null)[],
  numberNotes: number[][],
  operatorNotes: Operator[][],
): FormulaAnalysis {
  const domains = new Map(
    puzzle.expressions.map((e) => [
      e.id,
      expressionDomain(
        puzzle,
        e,
        numbers,
        operators,
        numberNotes,
        operatorNotes,
      ),
    ]),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < puzzle.cells.length; index++) {
      const touching = expressionsForCell(puzzle, index);
      if (touching.length < 2) continue;
      if (puzzle.cells[index] === "number") {
        const sets = touching.map(
            (e) =>
              new Set(domains.get(e.id)!.map((x) => x.numbers.get(index)!)),
          ),
          shared = new Set(
            [...sets[0]].filter((v) => sets.every((s) => s.has(v))),
          );
        for (const e of touching) {
          const old = domains.get(e.id)!,
            next = old.filter((x) => shared.has(x.numbers.get(index)!));
          if (next.length !== old.length) {
            domains.set(e.id, next);
            changed = true;
          }
        }
      } else if (puzzle.cells[index] === "operator") {
        const sets = touching.map(
            (e) =>
              new Set(domains.get(e.id)!.map((x) => x.operators.get(index)!)),
          ),
          shared = new Set(
            [...sets[0]].filter((v) => sets.every((s) => s.has(v))),
          );
        for (const e of touching) {
          const old = domains.get(e.id)!,
            next = old.filter((x) => shared.has(x.operators.get(index)!));
          if (next.length !== old.length) {
            domains.set(e.id, next);
            changed = true;
          }
        }
      }
    }
  }
  const numberCandidates = puzzle.cells.map((kind, index) => {
      if (kind !== "number" || numbers[index]) return [];
      const sets = expressionsForCell(puzzle, index).map(
        (e) => new Set(domains.get(e.id)!.map((x) => x.numbers.get(index)!)),
      );
      return sets.length
        ? [...sets[0]].filter((v) => sets.every((s) => s.has(v))).sort()
        : [];
    }),
    operatorCandidates = puzzle.cells.map((kind, index) => {
      if (kind !== "operator" || operators[index]) return [];
      const sets = expressionsForCell(puzzle, index).map(
        (e) => new Set(domains.get(e.id)!.map((x) => x.operators.get(index)!)),
      );
      return sets.length
        ? puzzle.allowedOperators.filter((v) => sets.every((s) => s.has(v)))
        : [];
    });
  return {
    domains,
    numberCandidates,
    operatorCandidates,
    forcedNumbers: numberCandidates.flatMap((x, index) =>
      x.length === 1 ? [{ index, value: x[0] }] : [],
    ),
    forcedOperators: operatorCandidates.flatMap((x, index) =>
      x.length === 1 ? [{ index, value: x[0] }] : [],
    ),
    contradictionExpressionId:
      puzzle.expressions.find((e) => domains.get(e.id)!.length === 0)?.id ??
      null,
  };
}
export function isComplete(puzzle: FormulaPuzzle, state: FormulaState) {
  if (
    puzzle.cells.some(
      (kind, index) =>
        (kind === "number" && !state.numbers[index]) ||
        (kind === "operator" && !state.operators[index]),
    )
  )
    return false;
  return puzzle.expressions.every((e) => {
    const nums = e.cells
        .filter((_, i) => i % 2 === 0)
        .map((i) => state.numbers[i]),
      ops = e.cells
        .filter((_, i) => i % 2 === 1)
        .map((i) => state.operators[i]!);
    return (
      new Set(nums).size === nums.length &&
      evaluateExpression(nums, ops) === e.target
    );
  });
}
export function enterValue(
  puzzle: FormulaPuzzle,
  state: FormulaState,
  value: number | Operator,
) {
  const index = state.selected;
  if (index === null || state.hypothesis || state.hinted.includes(index))
    return state;
  if (
    puzzle.cells[index] === "number" &&
    typeof value === "number" &&
    !puzzle.numberGivens[index]
  ) {
    const numbers = [...state.numbers];
    numbers[index] = value;
    return { ...state, numbers };
  }
  if (
    puzzle.cells[index] === "operator" &&
    typeof value === "string" &&
    !puzzle.operatorGivens[index]
  ) {
    const operators = [...state.operators];
    operators[index] = value;
    return { ...state, operators };
  }
  return state;
}
export function clearValue(puzzle: FormulaPuzzle, state: FormulaState) {
  const index = state.selected;
  if (index === null || state.hinted.includes(index)) return state;
  if (state.hypothesis) {
    const numbers = [...state.hypothesis.numbers],
      operators = [...state.hypothesis.operators],
      history = [
        ...state.hypothesis.history,
        {
          numbers: [...state.hypothesis.numbers],
          operators: [...state.hypothesis.operators],
        },
      ];
    numbers[index] = 0;
    operators[index] = null;
    return {
      ...state,
      hypothesis: { ...state.hypothesis, numbers, operators, history },
    };
  }
  if (puzzle.numberGivens[index] || puzzle.operatorGivens[index]) return state;
  const numbers = [...state.numbers],
    operators = [...state.operators];
  numbers[index] = 0;
  operators[index] = null;
  return { ...state, numbers, operators };
}
export function addNotes(puzzle: FormulaPuzzle, state: FormulaState) {
  if (state.selected === null) return state;
  const a = analyzeFormula(
      puzzle,
      workingNumbers(state),
      workingOperators(state),
      state.numberNotes,
      state.operatorNotes,
    ),
    numberNotes = state.numberNotes.map((x) => [...x]),
    operatorNotes = state.operatorNotes.map((x) => [...x]);
  numberNotes[state.selected] = a.numberCandidates[state.selected];
  operatorNotes[state.selected] = a.operatorCandidates[state.selected];
  return { ...state, numberNotes, operatorNotes };
}
export function revealHint(puzzle: FormulaPuzzle, state: FormulaState) {
  const index = puzzle.cells.findIndex(
    (kind, i) =>
      kind !== "block" &&
      !state.hinted.includes(i) &&
      (kind === "number"
        ? state.numbers[i] !== puzzle.numberSolution[i]
        : state.operators[i] !== puzzle.operatorSolution[i]),
  );
  if (index < 0) return state;
  const numbers = [...state.numbers],
    operators = [...state.operators];
  numbers[index] = puzzle.numberSolution[index];
  operators[index] = puzzle.operatorSolution[index];
  return {
    ...state,
    numbers,
    operators,
    selected: index,
    hinted: [...state.hinted, index],
    hintCount: state.hintCount + 1,
  };
}
export const startHypothesis = (state: FormulaState) =>
  state.hypothesis
    ? state
    : {
        ...state,
        hypothesis: {
          numbers: Array(state.numbers.length).fill(0),
          operators: Array(state.operators.length).fill(null),
          history: [],
          selectedExpressionId: null,
        },
      };
export const discardHypothesis = (state: FormulaState) => ({
  ...state,
  hypothesis: null,
});
export const selectHypothesisExpression = (state: FormulaState, id: string) =>
  state.hypothesis
    ? {
        ...state,
        hypothesis: { ...state.hypothesis, selectedExpressionId: id },
      }
    : state;
function pushHypothesis(
  state: FormulaState,
  numbers: number[],
  operators: (Operator | null)[],
) {
  return state.hypothesis
    ? {
        ...state,
        hypothesis: {
          ...state.hypothesis,
          numbers,
          operators,
          history: [
            ...state.hypothesis.history,
            {
              numbers: [...state.hypothesis.numbers],
              operators: [...state.hypothesis.operators],
            },
          ],
        },
      }
    : state;
}
export function applyAssignment(state: FormulaState, a: ExpressionAssignment) {
  if (!state.hypothesis) return state;
  const numbers = [...state.hypothesis.numbers],
    operators = [...state.hypothesis.operators];
  a.numbers.forEach((v, i) => {
    if (!state.numbers[i]) numbers[i] = v;
  });
  a.operators.forEach((v, i) => {
    if (!state.operators[i]) operators[i] = v;
  });
  return pushHypothesis(state, numbers, operators);
}
export function applyForced(state: FormulaState, a: FormulaAnalysis) {
  if (!state.hypothesis) return state;
  const numbers = [...state.hypothesis.numbers],
    operators = [...state.hypothesis.operators];
  a.forcedNumbers.forEach((x) => {
    if (!state.numbers[x.index]) numbers[x.index] = x.value;
  });
  a.forcedOperators.forEach((x) => {
    if (!state.operators[x.index]) operators[x.index] = x.value;
  });
  return pushHypothesis(state, numbers, operators);
}
export function enterHypothesis(state: FormulaState, value: number | Operator) {
  if (!state.hypothesis || state.selected === null) return state;
  const numbers = [...state.hypothesis.numbers],
    operators = [...state.hypothesis.operators];
  if (typeof value === "number" && !state.numbers[state.selected])
    numbers[state.selected] = value;
  else if (typeof value === "string" && !state.operators[state.selected])
    operators[state.selected] = value;
  else return state;
  return pushHypothesis(state, numbers, operators);
}
export function undoHypothesis(state: FormulaState) {
  if (!state.hypothesis?.history.length) return state;
  const history = [...state.hypothesis.history],
    snapshot = history.pop()!;
  return {
    ...state,
    hypothesis: { ...state.hypothesis, ...snapshot, history },
  };
}
export const commitHypothesis = (state: FormulaState) =>
  state.hypothesis
    ? {
        ...state,
        numbers: workingNumbers(state),
        operators: workingOperators(state),
        hypothesis: null,
      }
    : state;
