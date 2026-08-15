import {
  deleteSession,
  listSessions,
  loadSession,
  saveSession,
} from "../../../common/storage/database";
import type {
  SlitherlinkPuzzle,
  SlitherlinkState,
} from "../domain/slitherlink";
const GAME = "slitherlink";
export const saveSlitherlinkSession = (
  puzzle: SlitherlinkPuzzle,
  state: SlitherlinkState,
) =>
  saveSession({
    gameId: GAME,
    puzzleId: puzzle.id,
    schemaVersion: 1,
    state,
    puzzle: puzzle.generated ? puzzle : undefined,
    updatedAt: new Date().toISOString(),
  });
export async function loadSlitherlinkSession(puzzle: SlitherlinkPuzzle) {
  const saved = await loadSession<SlitherlinkState>(GAME, puzzle.id);
  return saved && Object.keys(saved.state.edges).length
    ? saved.state
    : undefined;
}
export const deleteSlitherlinkSession = (id: string) => deleteSession(GAME, id);
export const listSlitherlinkProgress = () =>
  listSessions<SlitherlinkState>(GAME);
export async function loadGeneratedSlitherlinks() {
  return (await listSessions<SlitherlinkState>(GAME))
    .map((item) => item.puzzle)
    .filter((p): p is SlitherlinkPuzzle =>
      Boolean(p && (p as SlitherlinkPuzzle).generated),
    );
}
