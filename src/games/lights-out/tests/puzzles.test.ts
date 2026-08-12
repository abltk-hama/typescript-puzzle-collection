import { describe,expect,it } from 'vitest'
import { parsePuzzles } from '../data/puzzles'
const valid={schema_version:1,game_type:'lights_out',puzzles:[{id:'one',title:'One',difficulty:'easy',problem:{width:5,height:5,initial_state:['01000','11100','01000','00000','00000']},answer:{one_solution_moves:[[1,1]]},metadata:{}}]}
describe('puzzle parser',()=>{it('accepts the Python v1 contract',()=>expect(parsePuzzles(valid)[0].initialState.filter(Boolean)).toHaveLength(5));it('rejects invalid rows',()=>expect(()=>parsePuzzles({...valid,puzzles:[{...valid.puzzles[0],problem:{...valid.puzzles[0].problem,initial_state:['x']}}]})).toThrow());it('rejects an inconsistent answer',()=>expect(()=>parsePuzzles({...valid,puzzles:[{...valid.puzzles[0],answer:{one_solution_moves:[]}}]})).toThrow())})
