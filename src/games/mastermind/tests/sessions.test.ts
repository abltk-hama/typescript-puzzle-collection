import { beforeEach,expect,it } from 'vitest'
import { deleteDB } from 'idb'
import { generateMastermind } from '../generation/generate'
import { initialGame,revealPosition,setSymbol } from '../domain/mastermind'
import { loadGeneratedPuzzles,loadMastermindSession,saveMastermindSession } from '../data/sessions'
beforeEach(async()=>deleteDB('puzzle-collection'))
it('restores generated puzzle definition and progress',async()=>{const puzzle=generateMastermind(7,'medium');let state=setSymbol(puzzle,initialGame(puzzle),1);state=revealPosition(puzzle,state,2);await saveMastermindSession(puzzle,state);expect(await loadMastermindSession(puzzle)).toEqual(state);expect((await loadGeneratedPuzzles())[0]).toEqual(puzzle)})
