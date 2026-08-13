import { z } from "zod";
import type { Difficulty, NonogramPuzzle } from "../domain/nonogram";
import { validatePuzzle } from "../domain/nonogram";
import { solveNonogram } from "../domain/solver";
const entry = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  problem: z.object({
    width: z.union([z.literal(5), z.literal(10)]),
    height: z.union([z.literal(5), z.literal(10)]),
    row_clues: z.array(z.array(z.number().int().positive())),
    column_clues: z.array(z.array(z.number().int().positive())),
  }),
  answer: z.object({ filled_cells: z.array(z.string()) }),
});
const root = z.object({
  schema_version: z.literal(1),
  game_type: z.literal("nonogram"),
  puzzles: z.array(entry),
});
export function parsePuzzles(raw: unknown) {
  const data = root.parse(raw),
    ids = new Set<string>();
  return data.puzzles.map((item) => {
    if (ids.has(item.id))
      throw new Error(`ノノグラムの問題IDが重複しています: ${item.id}`);
    ids.add(item.id);
    const solution = item.answer.filled_cells.flatMap((row) =>
      [...row].map((value) => value === "1"),
    );
    if (
      item.answer.filled_cells.length !== item.problem.height ||
      item.answer.filled_cells.some(
        (row) => row.length !== item.problem.width || /[^01]/.test(row),
      )
    )
      throw new Error(`解答データが不正です: ${item.id}`);
    const puzzle: NonogramPuzzle = {
      id: item.id,
      title: item.title,
      difficulty: item.difficulty as Difficulty,
      width: item.problem.width,
      height: item.problem.height,
      rowClues: item.problem.row_clues,
      columnClues: item.problem.column_clues,
      solution,
    };
    if (!validatePuzzle(puzzle))
      throw new Error(`問題データが不正です: ${item.id}`);
    if (solveNonogram(puzzle.rowClues, puzzle.columnClues).status !== "unique")
      throw new Error(`問題が一意解ではありません: ${item.id}`);
    return puzzle;
  });
}
export const bundledPuzzlesUrl = (baseUrl: string) =>
  `${baseUrl}puzzles/nonogram/puzzles.json`;
export async function loadBundledPuzzles() {
  const response = await fetch(bundledPuzzlesUrl(import.meta.env.BASE_URL));
  if (!response.ok) throw new Error("ノノグラム問題を読み込めませんでした。");
  return parsePuzzles(await response.json());
}
