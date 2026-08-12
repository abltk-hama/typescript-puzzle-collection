import {
  cluesForSolution,
  type Difficulty,
  type NonogramPuzzle,
} from "../domain/nonogram";
import { solveNonogram } from "../domain/solver";
export const PROFILES = {
  easy: "かんたん傾向",
  medium: "ふつう傾向",
  hard: "むずかしい傾向",
} as const;
function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
const integer = (random: () => number, max: number) =>
  Math.floor(random() * max);
function candidate(
  random: () => number,
  size: 5 | 10,
  profile: keyof typeof PROFILES,
) {
  const cells = Array(size * size).fill(false),
    count = { easy: 2, medium: 3, hard: 4 }[profile],
    symmetry = ["horizontal", "vertical", "both"][integer(random, 3)];
  for (let primitive = 0; primitive < count; primitive++) {
    const kind = ["rectangle", "line", "diamond"][integer(random, 3)],
      centerRow = integer(random, size),
      centerColumn = integer(random, size),
      radius = 1 + integer(random, Math.max(1, Math.floor(size / 3))),
      rowRadius = integer(random, radius + 1);
    for (let row = 0; row < size; row++)
      for (let column = 0; column < size; column++) {
        let fill = false;
        if (kind === "rectangle")
          fill =
            Math.abs(row - centerRow) <= rowRadius &&
            Math.abs(column - centerColumn) <= radius;
        else if (kind === "line")
          fill =
            (row === centerRow && Math.abs(column - centerColumn) <= radius) ||
            (column === centerColumn && Math.abs(row - centerRow) <= radius);
        else
          fill =
            Math.abs(row - centerRow) + Math.abs(column - centerColumn) <=
            radius;
        if (fill) {
          const points = [[row, column]];
          if (symmetry === "horizontal" || symmetry === "both")
            points.push([size - 1 - row, column]);
          if (symmetry === "vertical" || symmetry === "both")
            points.push([row, size - 1 - column]);
          if (symmetry === "both")
            points.push([size - 1 - row, size - 1 - column]);
          for (const [r, c] of points) cells[r * size + c] = true;
        }
      }
  }
  return cells;
}
export function generateNonogram(
  seed: number,
  size: 5 | 10,
  profile: keyof typeof PROFILES,
  onProgress?: (n: number) => void,
  maxAttempts = 300,
): NonogramPuzzle {
  const random = rng(seed);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onProgress?.(Math.round((attempt / maxAttempts) * 100));
    const solution = candidate(random, size, profile),
      filled = solution.filter(Boolean).length;
    if (filled < size || filled > size * size - size) continue;
    const { rows, columns } = cluesForSolution(solution, size, size),
      result = solveNonogram(rows, columns);
    if (result.status !== "unique") continue;
    let hash = 2166136261;
    for (const value of solution) {
      hash ^= value ? 49 : 48;
      hash = Math.imul(hash, 16777619);
    }
    return {
      id: `nonogram-generated-${(hash >>> 0).toString(16)}`,
      title: "生成模様",
      difficulty: profile as Difficulty,
      width: size,
      height: size,
      rowClues: rows,
      columnClues: columns,
      solution,
      generated: true,
      estimatedDifficulty: result.estimatedDifficulty,
    };
  }
  throw new Error(
    "条件を満たす一意解の生成問題が見つかりませんでした。もう一度お試しください。",
  );
}
