import { deleteSession,listSessions,loadSession,saveSession } from '../../../common/storage/database'
import type { FifteenPuzzle,FifteenState } from '../domain/fifteen'
import { restore } from '../domain/fifteen'
import { validatePuzzle } from './puzzles'
const GAME='fifteen'
export async function loadFifteenSession(puzzle:FifteenPuzzle){const saved=await loadSession<FifteenState>(GAME,puzzle.id);if(!saved)return undefined;return restore(puzzle,saved.state)}
export async function saveFifteenSession(puzzle:FifteenPuzzle,state:FifteenState){return saveSession({gameId:GAME,puzzleId:puzzle.id,schemaVersion:1,state,puzzle:puzzle.difficulty==='generated'?puzzle:undefined,updatedAt:new Date().toISOString()})}
export async function deleteFifteenSession(puzzleId:string){return deleteSession(GAME,puzzleId)}
export async function listFifteenProgress(){return listSessions<FifteenState>(GAME)}
export async function loadGeneratedPuzzles(){const sessions=await listSessions<FifteenState>(GAME),result:FifteenPuzzle[]=[];for(const session of sessions){if(session.puzzle)try{result.push(validatePuzzle(session.puzzle as FifteenPuzzle))}catch{continue}}return result}
