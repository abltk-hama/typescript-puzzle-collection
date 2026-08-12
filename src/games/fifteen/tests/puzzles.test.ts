import { describe,expect,it } from 'vitest'
import { parsePuzzles } from '../data/puzzles'
const valid={schema_version:1,game_type:'fifteen',puzzles:[{id:'one',title:'One',difficulty:'easy',problem:{initial_tiles:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,0,15]},answer:{known_solution:[15]},metadata:{}}]}
describe('15 puzzle parser',()=>{it('accepts the Python v1 contract',()=>expect(parsePuzzles(valid)[0].knownSolution).toEqual([15]));it('rejects duplicate tiles',()=>expect(()=>parsePuzzles({...valid,puzzles:[{...valid.puzzles[0],problem:{initial_tiles:Array(16).fill(0)}}]})).toThrow());it('rejects a known solution that does not finish',()=>expect(()=>parsePuzzles({...valid,puzzles:[{...valid.puzzles[0],answer:{known_solution:[]}}]})).toThrow())})
