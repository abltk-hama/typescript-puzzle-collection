import { deleteSession,listSessions,loadSession,saveSession } from '../../../common/storage/database'
import type { SudokuPuzzle,SudokuState } from '../domain/sudoku'
const GAME='sudoku'
export async function saveSudokuSession(puzzle:SudokuPuzzle,state:SudokuState){return saveSession({gameId:GAME,puzzleId:puzzle.id,schemaVersion:1,state,puzzle:puzzle.generated?puzzle:undefined,updatedAt:new Date().toISOString()})}
export async function loadSudokuSession(puzzle:SudokuPuzzle){const saved=await loadSession<SudokuState>(GAME,puzzle.id);if(!saved)return;const state=saved.state;if(state.values.length!==81||state.notes.length!==81)return;return state}
export const deleteSudokuSession=(id:string)=>deleteSession(GAME,id)
export async function listSudokuProgress(){return listSessions<SudokuState>(GAME)}
export async function loadGeneratedPuzzles(){const sessions=await listSessions<SudokuState>(GAME);return sessions.map(item=>item.puzzle).filter((p):p is SudokuPuzzle=>Boolean(p&&(p as SudokuPuzzle).generated))}
