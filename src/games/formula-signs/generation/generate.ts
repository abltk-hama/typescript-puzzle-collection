import {
  evaluateExpression,
  type CellKind,
  type FormulaDifficulty,
  type FormulaExpression,
  type FormulaPuzzle,
  type Operator,
} from "../domain/formulaSigns";
import { countSolutions } from "../domain/solver";
function random(seed: number) {
  let value = seed || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], rng: () => number) {
  return items
    .map((value) => ({ value, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.value);
}
function independent(count: 3 | 4) {
  const size = count * 2 - 1,
    cells: CellKind[] = Array(size * size).fill("block"),
    expressions: FormulaExpression[] = [];
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      if (row % 2 === 0 && col % 2 === 0) cells[index] = "number";
      else if (row % 2 !== col % 2) cells[index] = "operator";
    }
  for (let unit = 0; unit < count; unit++) {
    expressions.push({
      id: `h${unit}`,
      direction: "horizontal",
      cells: Array.from({ length: size }, (_, col) => unit * 2 * size + col),
      target: 0,
    });
    expressions.push({
      id: `v${unit}`,
      direction: "vertical",
      cells: Array.from({ length: size }, (_, row) => row * size + unit * 2),
      target: 0,
    });
  }
  return { width: size, height: size, cells, expressions };
}
function shared() {
  const width = 5,
    height = 5,
    cells: CellKind[] = Array(25).fill("block"),
    expressions: FormulaExpression[] = [];
  for (const row of [1, 3])
    for (let col = 0; col < 5; col++)
      cells[row * 5 + col] = col % 2 === 0 ? "number" : "operator";
  for (const col of [1, 3])
    for (let row = 0; row < 5; row++)
      cells[row * 5 + col] = row % 2 === 0 ? "number" : "operator";
  for (const row of [1, 3])
    expressions.push({
      id: `h${row}`,
      direction: "horizontal",
      cells: Array.from({ length: 5 }, (_, col) => row * 5 + col),
      target: 0,
    });
  for (const col of [1, 3])
    expressions.push({
      id: `v${col}`,
      direction: "vertical",
      cells: Array.from({ length: 5 }, (_, row) => row * 5 + col),
      target: 0,
    });
  return { width, height, cells, expressions };
}
export function generateFormulaSigns(
  seed = Date.now() >>> 0,
  difficulty: FormulaDifficulty = "easy",
): FormulaPuzzle {
  const rng = random(seed),
    layout =
      difficulty === "easy"
        ? independent(3)
        : difficulty === "medium"
          ? independent(4)
          : shared(),
    allowedOperators: Operator[] =
      difficulty === "easy" ? ["+", "-"] : ["+", "-", "*"];
  for (let attempt = 0; attempt < 600; attempt++) {
    const numberSolution = Array(layout.cells.length).fill(0),
      operatorSolution: (Operator | null)[] = Array(layout.cells.length).fill(
        null,
      );
    if (difficulty === "hard" || difficulty === "challenge") {
      for (const expression of layout.expressions) {
        const numberCells = expression.cells.filter((_, i) => i % 2 === 0);
        if (numberCells.some((index) => numberSolution[index])) continue;
        shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)
          .slice(0, numberCells.length)
          .forEach((value, i) => (numberSolution[numberCells[i]] = value));
      }
    } else {
      const count = (layout.width + 1) / 2,
        offset = Math.floor(rng() * 9);
      for (let row = 0; row < count; row++)
        for (let col = 0; col < count; col++)
          numberSolution[row * 2 * layout.width + col * 2] =
            ((row * count + col + offset) % 9) + 1;
    }
    layout.cells.forEach((kind, index) => {
      if (kind === "operator")
        operatorSolution[index] =
          allowedOperators[Math.floor(rng() * allowedOperators.length)];
    });
    const expressions = layout.expressions.map((expression) => {
        const numbers = expression.cells
            .filter((_, i) => i % 2 === 0)
            .map((index) => numberSolution[index]),
          operators = expression.cells
            .filter((_, i) => i % 2 === 1)
            .map((index) => operatorSolution[index]!);
        return {
          ...expression,
          target: evaluateExpression(numbers, operators),
        };
      }),
      numberGivens = [...numberSolution],
      operatorGivens: (Operator | null)[] = Array(layout.cells.length).fill(
        null,
      );
    if (difficulty === "hard") {
      const sharedOperators = layout.cells
        .map((kind, index) => ({ kind, index }))
        .filter(
          (item) =>
            item.kind === "operator" &&
            expressions.filter((expression) =>
              expression.cells.includes(item.index),
            ).length === 2,
        );
      shuffle(sharedOperators, rng)
        .slice(0, Math.floor(sharedOperators.length / 2))
        .forEach(
          (item) => (operatorGivens[item.index] = operatorSolution[item.index]),
        );
    }
    if (difficulty === "challenge")
      for (const expression of expressions) {
        const candidates = expression.cells
          .filter((_, i) => i % 2 === 0)
          .filter((index) => numberGivens[index]);
        if (candidates.length) numberGivens[shuffle(candidates, rng)[0]] = 0;
      }
    const puzzle: FormulaPuzzle = {
      id: `generated-formula-${difficulty}-${seed}`,
      title: `生成問題 ${difficultyLabel(difficulty)}`,
      difficulty,
      ...layout,
      expressions,
      allowedOperators,
      numberSolution,
      operatorSolution,
      numberGivens,
      operatorGivens,
      generated: true,
    };
    if (countSolutions(puzzle) === 1) return puzzle;
  }
  throw new Error(
    "一意解の数式符号パズルを生成できませんでした。もう一度お試しください。",
  );
}
export const difficultyLabel = (difficulty: FormulaDifficulty) =>
  ({
    easy: "やさしい",
    medium: "ふつう",
    hard: "むずかしい",
    challenge: "挑戦",
  })[difficulty];
