import { z } from 'zod'
import type { Difficulty,SudokuPuzzle } from '../domain/sudoku'
import { validateGrid } from '../domain/sudoku'
import { countSolutions } from '../generation/solver'
const entrySchema=z.object({id:z.string().min(1),title:z.string().min(1),difficulty:z.enum(['easy','medium','hard']),problem:z.object({givens:z.string().regex(/^\d{81}$/)}),answer:z.object({solution:z.string().regex(/^[1-9]{81}$/)})})
const rootSchema=z.object({schema_version:z.literal(1),game_type:z.literal('sudoku'),puzzles:z.array(entrySchema)})
export function parsePuzzles(raw:unknown):SudokuPuzzle[]{const data=rootSchema.parse(raw),ids=new Set<string>();return data.puzzles.map(entry=>{if(ids.has(entry.id))throw new Error(`数独の問題IDが重複しています: ${entry.id}`);ids.add(entry.id);const givens=[...entry.problem.givens].map(Number),solution=[...entry.answer.solution].map(Number);if(!validateGrid(givens)||!validateGrid(solution,true)||givens.some((value,index)=>value!==0&&value!==solution[index]))throw new Error(`数独の盤面が不正です: ${entry.id}`);if(countSolutions(givens,2)!==1)throw new Error(`数独が一意解ではありません: ${entry.id}`);return{id:entry.id,title:entry.title,difficulty:entry.difficulty as Difficulty,givens,solution}})}
export const bundledPuzzlesUrl=(baseUrl:string)=>`${baseUrl}puzzles/sudoku/puzzles.json`
export async function loadBundledPuzzles(){const response=await fetch(bundledPuzzlesUrl(import.meta.env.BASE_URL));if(!response.ok)throw new Error('数独問題を読み込めませんでした。');return parsePuzzles(await response.json())}
