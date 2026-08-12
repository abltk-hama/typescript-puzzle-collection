import {
  deleteSession,
  listSessions,
  loadSession,
  saveSession,
} from "../../../common/storage/database";
import type {
  CellState,
  NonogramPuzzle,
  NonogramState,
} from "../domain/nonogram";
const GAME = "nonogram";
export async function saveNonogramSession(
  puzzle: NonogramPuzzle,
  state: NonogramState,
) {
  return saveSession({
    gameId: GAME,
    puzzleId: puzzle.id,
    schemaVersion: 1,
    state,
    puzzle: puzzle.generated ? puzzle : undefined,
    updatedAt: new Date().toISOString(),
  });
}
export async function loadNonogramSession(puzzle: NonogramPuzzle) {
  const saved = await loadSession<NonogramState>(GAME, puzzle.id);
  if (!saved) return;
  const state = saved.state;
  if (
    state.cells.length !== puzzle.width * puzzle.height ||
    state.cells.some((value) => ![0, 1, 2].includes(value)) ||
    ![1, 2].includes(state.inputMode) ||
    !Array.isArray(state.history) ||
    !Array.isArray(state.hinted) ||
    !Number.isInteger(state.hintCount) ||
    state.hintCount < state.hinted.length
  )
    return;
  const replay = Array<CellState>(state.cells.length).fill(0);
  for (const stroke of state.history) {
    if (!Array.isArray(stroke) || !stroke.length) return;
    for (const change of stroke) {
      if (
        !Number.isInteger(change.index) ||
        change.index < 0 ||
        change.index >= replay.length ||
        ![0, 1, 2].includes(change.before) ||
        ![0, 1, 2].includes(change.after) ||
        replay[change.index] !== change.before
      )
        return;
      replay[change.index] = change.after;
    }
  }
  if (new Set(state.hinted).size !== state.hinted.length) return;
  for (const index of state.hinted) {
    if (!Number.isInteger(index) || index < 0 || index >= replay.length) return;
    replay[index] = puzzle.solution[index] ? 1 : 2;
  }
  if (replay.some((value, index) => value !== state.cells[index])) return;
  return state;
}
export const deleteNonogramSession = (id: string) => deleteSession(GAME, id);
export const listNonogramProgress = () => listSessions<NonogramState>(GAME);
export async function loadGeneratedPuzzles() {
  const items = await listSessions<NonogramState>(GAME);
  return items
    .map((item) => item.puzzle)
    .filter((p): p is NonogramPuzzle =>
      Boolean(p && (p as NonogramPuzzle).generated),
    );
}
