export interface SolverMetrics {
  propagationRounds: number;
  guesses: number;
  searchNodes: number;
  maxDepth: number;
}
export interface SolveResult {
  status: "no_solution" | "unique" | "multiple";
  solutions: boolean[][];
  metrics: SolverMetrics;
  estimatedDifficulty: "easy" | "medium" | "hard";
}
export function linePatterns(length: number, clues: number[]) {
  const result: boolean[][] = [];
  function place(clueIndex: number, start: number, line: boolean[]) {
    if (clueIndex === clues.length) {
      result.push(line);
      return;
    }
    const remaining =
      clues.slice(clueIndex + 1).reduce((a, b) => a + b, 0) +
      Math.max(0, clues.length - clueIndex - 1);
    for (
      let position = start;
      position + clues[clueIndex] + remaining <= length;
      position++
    ) {
      const next = [...line];
      for (let i = 0; i < clues[clueIndex]; i++) next[position + i] = true;
      place(clueIndex + 1, position + clues[clueIndex] + 1, next);
    }
  }
  if (!clues.length) return [Array(length).fill(false)];
  place(0, 0, Array(length).fill(false));
  return result;
}
export function solveNonogram(
  rowClues: number[][],
  columnClues: number[][],
  maxSolutions = 2,
): SolveResult {
  const height = rowClues.length,
    width = columnClues.length,
    solutions: boolean[][] = [];
  let propagationRounds = 0,
    guesses = 0,
    searchNodes = 0,
    maxDepth = 0;
  const initialRows = rowClues.map((c) => linePatterns(width, c)),
    initialColumns = columnClues.map((c) => linePatterns(height, c));
  function search(
    rowOptions: boolean[][][],
    columnOptions: boolean[][][],
    depth: number,
  ) {
    if (solutions.length >= maxSolutions) return;
    searchNodes++;
    maxDepth = Math.max(maxDepth, depth);
    let changed = true;
    while (changed) {
      changed = false;
      propagationRounds++;
      for (let row = 0; row < height; row++) {
        const allowed = rowOptions[row].filter((pattern) =>
          pattern.every((value, column) =>
            columnOptions[column].some((candidate) => candidate[row] === value),
          ),
        );
        if (!allowed.length) return;
        if (allowed.length !== rowOptions[row].length) {
          rowOptions[row] = allowed;
          changed = true;
        }
      }
      for (let column = 0; column < width; column++) {
        const allowed = columnOptions[column].filter((pattern) =>
          pattern.every((value, row) =>
            rowOptions[row].some((candidate) => candidate[column] === value),
          ),
        );
        if (!allowed.length) return;
        if (allowed.length !== columnOptions[column].length) {
          columnOptions[column] = allowed;
          changed = true;
        }
      }
    }
    if (rowOptions.every((options) => options.length === 1)) {
      const solution = rowOptions.flatMap((options) => options[0]);
      if (!solutions.some((item) => item.every((v, i) => v === solution[i])))
        solutions.push(solution);
      return;
    }
    const choices = [
        ...rowOptions.map((options, index) => ({
          kind: "row" as const,
          index,
          options,
        })),
        ...columnOptions.map((options, index) => ({
          kind: "column" as const,
          index,
          options,
        })),
      ]
        .filter((item) => item.options.length > 1)
        .sort((a, b) => a.options.length - b.options.length),
      choice = choices[0];
    guesses++;
    for (const pattern of choice.options) {
      const rows = rowOptions.map((options) => [...options]),
        columns = columnOptions.map((options) => [...options]);
      if (choice.kind === "row") rows[choice.index] = [pattern];
      else columns[choice.index] = [pattern];
      search(rows, columns, depth + 1);
      if (solutions.length >= maxSolutions) return;
    }
  }
  if (
    initialRows.some((x) => !x.length) ||
    initialColumns.some((x) => !x.length)
  )
    return {
      status: "no_solution",
      solutions: [],
      metrics: {
        propagationRounds: 0,
        guesses: 0,
        searchNodes: 1,
        maxDepth: 0,
      },
      estimatedDifficulty: "easy",
    };
  search(initialRows, initialColumns, 0);
  const status =
      solutions.length === 0
        ? "no_solution"
        : solutions.length === 1
          ? "unique"
          : "multiple",
    estimatedDifficulty =
      guesses === 0
        ? propagationRounds <= 8
          ? "easy"
          : "medium"
        : maxDepth <= 2 && searchNodes <= 20
          ? "medium"
          : "hard";
  return {
    status,
    solutions,
    metrics: { propagationRounds, guesses, searchNodes, maxDepth },
    estimatedDifficulty,
  };
}
