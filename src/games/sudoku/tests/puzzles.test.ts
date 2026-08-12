import { describe,expect,it } from 'vitest'
import { parsePuzzles } from '../data/puzzles'

const solution='534678912672195348198342567859761423426853791713924856961537284287419635345286179'
const givens='530070000600195000098000060800060003400803001700020006060000280000419005000080079'
const entry={id:'one',title:'問題',difficulty:'easy',problem:{givens},answer:{solution}}

describe('Sudoku puzzle data',()=>{
  it('accepts a valid unique puzzle',()=>expect(parsePuzzles({schema_version:1,game_type:'sudoku',puzzles:[entry]})).toHaveLength(1))
  it('rejects duplicate ids',()=>expect(()=>parsePuzzles({schema_version:1,game_type:'sudoku',puzzles:[entry,entry]})).toThrow(/重複/))
  it('rejects givens that disagree with the answer',()=>expect(()=>parsePuzzles({schema_version:1,game_type:'sudoku',puzzles:[{...entry,problem:{givens:`9${givens.slice(1)}`}}]})).toThrow(/不正/))
})
