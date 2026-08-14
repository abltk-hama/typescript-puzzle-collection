import {
  deleteSession,
  listSessions,
  loadSession,
  saveSession,
} from "../../../common/storage/database";
import type { KakuroPuzzle, KakuroState } from "../domain/kakuro";
const GAME = "kakuro";
export const saveKakuroSession = (puzzle: KakuroPuzzle, state: KakuroState) =>
  saveSession({
    gameId: GAME,
    puzzleId: puzzle.id,
    schemaVersion: 1,
    state,
    puzzle: puzzle.generated ? puzzle : undefined,
    updatedAt: new Date().toISOString(),
  });
export async function loadKakuroSession(puzzle: KakuroPuzzle) {
  const saved = await loadSession<KakuroState>(GAME, puzzle.id);
  return saved?.state.values.length === puzzle.white.length
    ? saved.state
    : undefined;
}
export const deleteKakuroSession = (id: string) => deleteSession(GAME, id);
export const listKakuroProgress = () => listSessions<KakuroState>(GAME);
export async function loadGeneratedKakuros() {
  return (await listSessions<KakuroState>(GAME))
    .map((item) => item.puzzle)
    .filter((p): p is KakuroPuzzle =>
      Boolean(p && (p as KakuroPuzzle).generated),
    );
}
