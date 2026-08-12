import { deleteSession,listSessions,loadSession,saveSession } from '../../../common/storage/database'
import type { MazePuzzle,MazeState } from '../domain/maze'
import { restore } from '../domain/maze'
import { validatePuzzle } from './puzzles'
const GAME='maze'
export async function loadMazeSession(puzzle:MazePuzzle){const saved=await loadSession<MazeState>(GAME,puzzle.id);return saved?restore(puzzle,saved.state):undefined}
export async function saveMazeSession(puzzle:MazePuzzle,state:MazeState){return saveSession({gameId:GAME,puzzleId:puzzle.id,schemaVersion:1,state,puzzle:puzzle.difficulty==='generated'?puzzle:undefined,updatedAt:new Date().toISOString()})}
export async function deleteMazeSession(puzzleId:string){return deleteSession(GAME,puzzleId)}
export async function listMazeProgress(){return listSessions<MazeState>(GAME)}
export async function loadGeneratedPuzzles(){const sessions=await listSessions<MazeState>(GAME),result:MazePuzzle[]=[];for(const session of sessions)if(session.puzzle)try{result.push(validatePuzzle(session.puzzle as MazePuzzle))}catch{continue}return result}
