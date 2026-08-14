import { describe,expect,it } from "vitest";
import { candidates,conflicts,countSolutions,initialSkyscraper,isComplete,lineCandidates,visibleCount,visibilityMarkers,type SkyscraperPuzzle } from "../domain/skyscraper";
const puzzle:SkyscraperPuzzle={id:"test",title:"test",difficulty:"easy",size:4,clues:{top:[4,3,2,1],right:[1,2,2,2],bottom:[1,2,2,2],left:[4,3,2,1]},givens:Array(16).fill(0),solution:[1,2,3,4,2,3,4,1,3,4,1,2,4,1,2,3]};
describe("skyscraper domain",()=>{
  it("counts buildings from the viewing edge",()=>expect(visibleCount([2,1,4,3])).toBe(2));
  it("distinguishes confirmed and provisional markers",()=>{const markers=visibilityMarkers([2,0,4,3],4,"left",0);expect(markers.get(0)).toBe("confirmed");expect(markers.get(2)).toBe("provisional")});
  it("filters permutations with both clues",()=>expect(lineCandidates([0,0,0,0],4,1)).toEqual([[1,2,3,4]]));
  it("uses row, column and clues for cell candidates",()=>expect(candidates(puzzle,puzzle.givens,0)).toEqual([1]));
  it("detects row and column duplicates",()=>expect([...conflicts([1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0],4)].sort()).toEqual([0,1,4]));
  it("accepts a constraint-complete grid and has one solution",()=>{const state={...initialSkyscraper(puzzle),values:[...puzzle.solution]};expect(isComplete(puzzle,state)).toBe(true);expect(countSolutions(puzzle)).toBe(1)});
});
