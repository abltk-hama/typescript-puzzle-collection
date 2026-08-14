import {
  buildRuns,
  type KakuroClue,
  type KakuroPuzzle,
} from "../domain/kakuro";
import { countSolutions, isPropagationSolvable } from "../domain/solver";
const masks = {
  5: ["#####", "#...#", "#...#", "#...#", "#####"],
  7: [
    "#######",
    "#..#..#",
    "#.....#",
    "##...##",
    "#.....#",
    "#..#..#",
    "#######",
  ],
  9: [
    "#########",
    "#...#...#",
    "#...#...#",
    "#.......#",
    "###...###",
    "#.......#",
    "#...#...#",
    "#...#...#",
    "#########",
  ],
} as const;
function rng(seed: number) {
  let v = seed || 1;
  return () => {
    v = Math.imul(v ^ (v >>> 15), 1 | v);
    v ^= v + Math.imul(v ^ (v >>> 7), 61 | v);
    return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], random: () => number) {
  return items
    .map((value) => ({ value, key: random() }))
    .sort((a, b) => a.key - b.key)
    .map((item) => item.value);
}
function structural(width: number, white: boolean[]) {
  const clues: KakuroClue[] = [];
  for (let index = 0; index < white.length; index++) {
    if (white[index]) continue;
    const clue: KakuroClue = { index };
    if (index % width < width - 2 && white[index + 1] && white[index + 2])
      clue.right = 1;
    if (
      index + width * 2 < white.length &&
      white[index + width] &&
      white[index + width * 2]
    )
      clue.down = 1;
    if (clue.right || clue.down) clues.push(clue);
  }
  return clues;
}
export function generateKakuro(
  seed = Date.now() >>> 0,
  size: 5 | 7 | 9 = 5,
): KakuroPuzzle {
  const random = rng(seed),
    white = masks[size].flatMap((row) => [...row].map((cell) => cell === "."));
  const structure: KakuroPuzzle = {
    id: "",
    title: "",
    difficulty: "generated",
    width: size,
    height: size,
    white,
    clues: structural(size, white),
    givens: Array(size * size).fill(0),
    solution: Array(size * size).fill(0),
  };
  const runs = buildRuns(structure),
    byCell = white.map((_, index) =>
      runs.filter((run) => run.cells.includes(index)),
    );
  for (let attempt = 0; attempt < 160; attempt++) {
    const solution = Array(size * size).fill(0),
      cells = white
        .map((value, index) => (value ? index : -1))
        .filter((index) => index >= 0);
    function fill(): boolean {
      const remaining = cells.filter((index) => !solution[index]);
      if (!remaining.length) return true;
      const pick = remaining
        .map((index) => ({
          index,
          values: shuffle(
            [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) =>
              byCell[index].every(
                (run) => !run.cells.some((cell) => solution[cell] === value),
              ),
            ),
            random,
          ),
        }))
        .sort((a, b) => a.values.length - b.values.length)[0];
      for (const value of pick.values) {
        solution[pick.index] = value;
        if (fill()) return true;
        solution[pick.index] = 0;
      }
      return false;
    }
    if (!fill()) continue;
    const clues = structure.clues.map((clue) => {
      const result: KakuroClue = { index: clue.index };
      for (const direction of ["right", "down"] as const)
        if (clue[direction]) {
          const run = runs.find(
            (item) =>
              item.clueIndex === clue.index && item.direction === direction,
          )!;
          result[direction] = run.cells.reduce(
            (sum, index) => sum + solution[index],
            0,
          );
        }
      return result;
    });
    const puzzle: KakuroPuzzle = {
      ...structure,
      id: `generated-kakuro-${size}-${seed}`,
      title: `生成カックロ ${size}×${size}`,
      clues,
      solution,
      generated: true,
      estimatedDifficulty:
        size === 5
          ? "やさしい目安"
          : size === 7
            ? "ふつう目安"
            : "むずかしい目安",
    };
    const revealOrder = shuffle([...cells], random);
    const initialRevealCount = size === 9 ? Math.floor(cells.length / 2) : 0;
    revealOrder
      .slice(0, initialRevealCount)
      .forEach((index) => (puzzle.givens[index] = solution[index]));
    for (const index of revealOrder.slice(initialRevealCount)) {
      if (
        countSolutions(puzzle) === 1 &&
        (size === 7 || isPropagationSolvable(puzzle))
      )
        return puzzle;
      puzzle.givens[index] = solution[index];
    }
    if (countSolutions(puzzle) === 1) return puzzle;
  }
  throw new Error(
    "一意解のカックロを生成できませんでした。もう一度お試しください。",
  );
}
