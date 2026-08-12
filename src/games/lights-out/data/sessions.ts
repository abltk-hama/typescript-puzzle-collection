import { deleteSession,loadSession,saveSession } from '../../../common/storage/database'
import type { LightsOutPuzzle,LightsOutState } from '../domain/lightsOut'
import { restore } from '../domain/lightsOut'
export async function loadLightsSession(puzzle:LightsOutPuzzle){const saved=await loadSession<LightsOutState>('lights_out',puzzle.id);if(!saved)return undefined;return restore(puzzle,saved.state)}
export async function saveLightsSession(puzzle:LightsOutPuzzle,state:LightsOutState){return saveSession({gameId:'lights_out',puzzleId:puzzle.id,schemaVersion:1,state,puzzle:puzzle.difficulty==='generated'?puzzle:undefined,updatedAt:new Date().toISOString()})}
export async function deleteLightsSession(puzzleId:string){return deleteSession('lights_out',puzzleId)}
