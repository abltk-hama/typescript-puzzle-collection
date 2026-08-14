import {
  deleteSession,
  listSessions,
  loadSession,
  saveSession,
} from "../../../common/storage/database";
import type { FormulaPuzzle, FormulaState } from "../domain/formulaSigns";
const GAME = "formula_signs";
export const saveFormulaSession = (
  puzzle: FormulaPuzzle,
  state: FormulaState,
) =>
  saveSession({
    gameId: GAME,
    puzzleId: puzzle.id,
    schemaVersion: 1,
    state,
    puzzle: puzzle.generated ? puzzle : undefined,
    updatedAt: new Date().toISOString(),
  });
export async function loadFormulaSession(puzzle: FormulaPuzzle) {
  const saved = await loadSession<FormulaState>(GAME, puzzle.id);
  return saved?.state.numbers.length === puzzle.cells.length
    ? saved.state
    : undefined;
}
export const deleteFormulaSession = (id: string) => deleteSession(GAME, id);
export const listFormulaProgress = () => listSessions<FormulaState>(GAME);
export async function loadGeneratedFormulas() {
  return (await listSessions<FormulaState>(GAME))
    .map((x) => x.puzzle)
    .filter((p): p is FormulaPuzzle =>
      Boolean(p && (p as FormulaPuzzle).generated),
    );
}
