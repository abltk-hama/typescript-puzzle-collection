import {
  DIRECTIONS,
  solutionPath,
  type MazePuzzle,
  type Position,
} from "../domain/maze";
export const PROFILES = {
  small: { label: "小型", size: 9 },
  medium: { label: "標準", size: 15 },
  large: { label: "大型", size: 21 },
  extraLarge: { label: "特大", size: 31 },
} as const;
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateMaze(
  seed: number,
  profile: keyof typeof PROFILES,
): MazePuzzle {
  const random = mulberry32(seed),
    size = PROFILES[profile].size,
    passages = Array(size * size).fill(0) as number[],
    start = { row: 0, column: 0 },
    stack: Position[] = [start],
    visited = new Set(["0,0"]);
  while (stack.length) {
    const current = stack.at(-1)!,
      choices = DIRECTIONS.map((direction) => ({
        direction,
        target: {
          row: current.row + direction.dr,
          column: current.column + direction.dc,
        },
      })).filter(
        ({ target }) =>
          target.row >= 0 &&
          target.row < size &&
          target.column >= 0 &&
          target.column < size &&
          !visited.has(`${target.row},${target.column}`),
      );
    if (!choices.length) {
      stack.pop();
      continue;
    }
    const { direction, target } =
      choices[Math.floor(random() * choices.length)];
    passages[current.row * size + current.column] |= direction.bit;
    passages[target.row * size + target.column] |= direction.opposite;
    visited.add(`${target.row},${target.column}`);
    stack.push(target);
  }
  const goal = { row: size - 1, column: size - 1 },
    base = { width: size, height: size, passages },
    answerPath = solutionPath(base, start, goal),
    degrees = passages.map(
      (mask) => DIRECTIONS.filter((direction) => mask & direction.bit).length,
    );
  return {
    id: `maze-generated-${seed.toString(16)}`,
    title: "生成迷路",
    difficulty: "generated",
    width: size,
    height: size,
    passages,
    start,
    goal,
    answerPath,
    metadata: {
      source_type: "procedural",
      generator_version: 1,
      seed,
      profile,
      solution_length: answerPath.length - 1,
      dead_end_count: degrees.filter((value) => value === 1).length,
      branch_count: degrees.filter((value) => value >= 3).length,
      difficulty_is_estimate: true,
    },
  };
}
