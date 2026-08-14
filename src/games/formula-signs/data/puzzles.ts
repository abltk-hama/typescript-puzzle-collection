import { z } from "zod";
import { countSolutions } from "../domain/solver";
import type { FormulaPuzzle } from "../domain/formulaSigns";
const operator = z.enum(["+", "-", "*"]),
  entry = z.object({
    id: z.string(),
    title: z.string(),
    difficulty: z.enum(["easy", "medium", "hard", "challenge"]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    cells: z.array(z.enum(["block", "number", "operator"])),
    expressions: z.array(
      z.object({
        id: z.string(),
        direction: z.enum(["horizontal", "vertical"]),
        cells: z.array(z.number().int().nonnegative()),
        target: z.number().int(),
      }),
    ),
    allowedOperators: z.array(operator),
    numberSolution: z.array(z.number().int().min(0).max(9)),
    operatorSolution: z.array(operator.nullable()),
    numberGivens: z.array(z.number().int().min(0).max(9)),
    operatorGivens: z.array(operator.nullable()),
  }),
  file = z.object({
    schema_version: z.literal(1),
    game_type: z.literal("formula_signs"),
    puzzles: z.array(entry),
  });
export function parsePuzzles(raw: unknown) {
  return file.parse(raw).puzzles.map((value) => {
    const puzzle = value as FormulaPuzzle,
      length = puzzle.width * puzzle.height;
    if (
      [
        puzzle.cells,
        puzzle.numberSolution,
        puzzle.operatorSolution,
        puzzle.numberGivens,
        puzzle.operatorGivens,
      ].some((items) => items.length !== length) ||
      countSolutions(puzzle) !== 1
    )
      throw new Error(`問題データが不正です: ${puzzle.id}`);
    return puzzle;
  });
}
export async function loadBundledPuzzles() {
  const response = await fetch(
    `${import.meta.env.BASE_URL}puzzles/formula-signs/puzzles.json`,
  );
  if (!response.ok)
    throw new Error("数式符号パズルの問題データを取得できません。");
  return parsePuzzles(await response.json());
}
