import { deleteSession,listSessions,loadSession,saveSession } from '../../../common/storage/database'
import type { MastermindPuzzle,MastermindState } from '../domain/mastermind'
import { restore } from '../domain/mastermind'
import { validatePuzzle } from './puzzles'
const GAME='mastermind'
export async function loadMastermindSession(puzzle:MastermindPuzzle){const saved=await loadSession<MastermindState>(GAME,puzzle.id);return saved?restore(puzzle,saved.state):undefined}
export async function saveMastermindSession(puzzle:MastermindPuzzle,state:MastermindState){return saveSession({gameId:GAME,puzzleId:puzzle.id,schemaVersion:1,state,puzzle:puzzle.difficulty==='generated'?puzzle:undefined,updatedAt:new Date().toISOString()})}
export async function deleteMastermindSession(puzzleId:string){return deleteSession(GAME,puzzleId)}
export async function listMastermindProgress(){return listSessions<MastermindState>(GAME)}
export async function loadGeneratedPuzzles(){const sessions=await listSessions<MastermindState>(GAME),result:MastermindPuzzle[]=[];for(const session of sessions)if(session.puzzle)try{result.push(validatePuzzle(session.puzzle as MastermindPuzzle))}catch{continue}return result}
