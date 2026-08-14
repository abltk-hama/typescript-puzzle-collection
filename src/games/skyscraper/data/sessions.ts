import { deleteSession,listSessions,loadSession,saveSession } from "../../../common/storage/database";
import type { SkyscraperPuzzle,SkyscraperState } from "../domain/skyscraper";
const GAME="skyscraper";
export async function saveSkyscraperSession(puzzle:SkyscraperPuzzle,state:SkyscraperState){return saveSession({gameId:GAME,puzzleId:puzzle.id,schemaVersion:1,state,puzzle:puzzle.generated?puzzle:undefined,updatedAt:new Date().toISOString()})}
export async function loadSkyscraperSession(puzzle:SkyscraperPuzzle){const saved=await loadSession<SkyscraperState>(GAME,puzzle.id);if(!saved||saved.state.values.length!==puzzle.size**2||saved.state.notes.length!==puzzle.size**2)return;return saved.state}
export const deleteSkyscraperSession=(id:string)=>deleteSession(GAME,id);
export const listSkyscraperProgress=()=>listSessions<SkyscraperState>(GAME);
export async function loadGeneratedSkyscrapers(){return(await listSessions<SkyscraperState>(GAME)).map(item=>item.puzzle).filter((p):p is SkyscraperPuzzle=>Boolean(p&&(p as SkyscraperPuzzle).generated))}
