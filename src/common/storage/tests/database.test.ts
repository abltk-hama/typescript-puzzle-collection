import { beforeEach,describe,expect,it } from 'vitest'
import { deleteDB } from 'idb'
import { deleteSession,loadSession,saveSession } from '../database'
describe('session database',()=>{beforeEach(async()=>deleteDB('puzzle-collection'));it('saves, loads, and deletes versioned progress',async()=>{await saveSession({gameId:'lights_out',puzzleId:'one',schemaVersion:1,state:{moves:2},updatedAt:'now'});expect((await loadSession<{moves:number}>('lights_out','one'))?.state.moves).toBe(2);await deleteSession('lights_out','one');expect(await loadSession('lights_out','one')).toBeUndefined()})})
