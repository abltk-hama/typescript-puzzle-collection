import { z } from "zod";
import { initialKakuro, isComplete, type KakuroPuzzle } from "../domain/kakuro";
import { countSolutions } from "../domain/solver";
const item = z.object({
    id: z.string(),
    title: z.string(),
    difficulty: z.enum(["easy", "medium"]),
    size: z.union([z.literal(5), z.literal(7)]),
    problem: z.object({
      mask: z.array(z.string()),
      clues: z.record(
        z.string(),
        z.object({
          right: z.number().int().positive().optional(),
          down: z.number().int().positive().optional(),
        }),
      ),
      givens: z.record(z.string(), z.number().int().min(1).max(9)).default({}),
    }),
    solution: z.array(z.array(z.number().int().min(0).max(9))),
  }),
  file = z.object({
    schema_version: z.literal(1),
    game_type: z.literal("kakuro"),
    puzzles: z.array(item),
  });
export function parsePuzzles(raw: unknown) {
  return file.parse(raw).puzzles.map((entry) => {
    if (
      entry.problem.mask.length !== entry.size ||
      entry.problem.mask.some((row) => row.length !== entry.size) ||
      entry.solution.length !== entry.size ||
      entry.solution.some((row) => row.length !== entry.size)
    )
      throw new Error(`盤面サイズが不正です: ${entry.id}`);
    const white = entry.problem.mask.flatMap((row) =>
        [...row].map((value) => value === "."),
      ),
      clues = Object.entries(entry.problem.clues).map(([key, value]) => {
        const [row, column] = key.split(",").map(Number);
        return { index: row * entry.size + column, ...value };
      }),
      givens = Array(entry.size ** 2).fill(0);
    Object.entries(entry.problem.givens).forEach(([key, value]) => {
      const [row, column] = key.split(",").map(Number);
      givens[row * entry.size + column] = value;
    });
    const puzzle: KakuroPuzzle = {
      id: entry.id,
      title: entry.title,
      difficulty: entry.difficulty,
      width: entry.size,
      height: entry.size,
      white,
      clues,
      givens,
      solution: entry.solution.flat(),
    };
    if (
      !isComplete(puzzle, {
        ...initialKakuro(puzzle),
        values: puzzle.solution,
      }) ||
      countSolutions(puzzle) !== 1
    )
      throw new Error(`問題または解答が不正です: ${entry.id}`);
    return puzzle;
  });
}
export const bundledPuzzlesUrl = (base: string) =>
  `${base}puzzles/kakuro/puzzles.json`;
export async function loadBundledPuzzles() {
  const response = await fetch(bundledPuzzlesUrl(import.meta.env.BASE_URL));
  if (!response.ok) throw new Error("カックロの問題データを取得できません。");
  return parsePuzzles(await response.json());
}
