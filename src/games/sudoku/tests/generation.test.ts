import { describe,expect,it } from 'vitest'
import { generateSudoku } from '../generation/generate'
import { countSolutions,solveSudoku } from '../generation/solver'
describe('Sudoku generation',()=>{it('solves a board',()=>{const grid=[...'530070000600195000098000060800060003400803001700020006060000280000419005000080079'].map(Number),result=solveSudoku(grid);expect(result.solution?.every(Boolean)).toBe(true)});it('creates a unique puzzle',()=>{const puzzle=generateSudoku(12345,'easy');expect(countSolutions(puzzle.givens,2)).toBe(1);expect(puzzle.givens.filter(Boolean).length).toBeGreaterThanOrEqual(40)})})
