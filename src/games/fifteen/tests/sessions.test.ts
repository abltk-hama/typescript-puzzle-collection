import { beforeEach,expect,it } from 'vitest'
import { deleteDB } from 'idb'
import { generateFifteen } from '../generation/generate'
import { initialGame,move } from '../domain/fifteen'
import { loadFifteenSession,loadGeneratedPuzzles,saveFifteenSession } from '../data/sessions'
beforeEach(async()=>deleteDB('puzzle-collection'))
it('restores generated puzzle definition and progress',async()=>{const puzzle=generateFifteen(7,'easy'),state=move(initialGame(puzzle),puzzle.knownSolution[0]);await saveFifteenSession(puzzle,state);expect(await loadFifteenSession(puzzle)).toEqual(state);expect((await loadGeneratedPuzzles())[0]).toEqual(puzzle)})
