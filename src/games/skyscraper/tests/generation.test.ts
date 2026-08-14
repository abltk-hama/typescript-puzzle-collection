import { describe,expect,it } from "vitest";
import { countSolutions,isComplete,initialSkyscraper } from "../domain/skyscraper";
import { generateSkyscraper } from "../generation/generate";
describe("skyscraper generation",()=>{it.each([4,5]as const)("generates a unique valid %sx%s puzzle",size=>{const puzzle=generateSkyscraper(1234,size),state={...initialSkyscraper(puzzle),values:puzzle.solution};expect(countSolutions(puzzle)).toBe(1);expect(isComplete(puzzle,state)).toBe(true);expect(Object.values(puzzle.clues).flat().some(value=>value===0)).toBe(true)})});
