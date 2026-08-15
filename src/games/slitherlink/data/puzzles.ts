import { z } from "zod";
import { initialSlitherlink, isComplete, type SlitherlinkPuzzle } from "../domain/slitherlink";

const item=z.object({id:z.string(),title:z.string(),difficulty:z.enum(["easy","medium","hard"]),width:z.number().int().min(2),height:z.number().int().min(2),clues:z.array(z.number().int().min(0).max(3).nullable()),solution_edges:z.array(z.string())}),file=z.object({schema_version:z.literal(1),game_type:z.literal("slitherlink"),puzzles:z.array(item)});
export function parsePuzzles(raw:unknown){return file.parse(raw).puzzles.map(entry=>{if(entry.clues.length!==entry.width*entry.height)throw new Error(`盤面サイズが不正です: ${entry.id}`);const puzzle:SlitherlinkPuzzle={id:entry.id,title:entry.title,difficulty:entry.difficulty,width:entry.width,height:entry.height,clues:entry.clues,solutionEdges:entry.solution_edges},solved={...initialSlitherlink(puzzle),edges:{...initialSlitherlink(puzzle).edges,...Object.fromEntries(puzzle.solutionEdges.map(edge=>[edge,"line" as const]))}};if(!isComplete(puzzle,solved))throw new Error(`問題または解答が不正です: ${entry.id}`);return puzzle})}
export const bundledPuzzlesUrl=(base:string)=>`${base}puzzles/slitherlink/puzzles.json`;
export async function loadBundledPuzzles(){const response=await fetch(bundledPuzzlesUrl(import.meta.env.BASE_URL));if(!response.ok)throw new Error("スリザーリンクの問題データを取得できません。");return parsePuzzles(await response.json())}
