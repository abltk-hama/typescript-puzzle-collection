import { describe,expect,it } from 'vitest'
import { parsePuzzles } from '../data/puzzles'
const valid={schema_version:1,game_type:'mastermind',puzzles:[{id:'one',title:'One',difficulty:'easy',problem:{code_length:4,symbol_count:6,allow_duplicates:false,max_attempts:10},answer:{secret:[1,2,3,4]},metadata:{}}]}
describe('Mastermind parser',()=>{it('accepts the Python v1 contract',()=>expect(parsePuzzles(valid)[0].secret).toEqual([1,2,3,4]));it('rejects duplicate easy symbols',()=>expect(()=>parsePuzzles({...valid,puzzles:[{...valid.puzzles[0],answer:{secret:[1,1,2,3]}}]})).toThrow());it('rejects invalid difficulty settings',()=>expect(()=>parsePuzzles({...valid,puzzles:[{...valid.puzzles[0],problem:{...valid.puzzles[0].problem,max_attempts:99}}]})).toThrow())})
