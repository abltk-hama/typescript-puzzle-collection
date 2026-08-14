import { describe,expect,it } from "vitest";
import { deleteSkyscraperSession,loadSkyscraperSession,saveSkyscraperSession } from "../data/sessions";
import { applyHypothesisSequence,initialSkyscraper,startHypothesis,type SkyscraperPuzzle } from "../domain/skyscraper";
const puzzle:SkyscraperPuzzle={id:"skyscraper-session-hypothesis",title:"Session",difficulty:"easy",size:4,clues:{top:[4,3,2,1],right:[1,2,2,2],bottom:[1,2,2,2],left:[4,3,2,1]},givens:Array(16).fill(0),solution:[1,2,3,4,2,3,4,1,3,4,1,2,4,1,2,3]};
describe("skyscraper sessions",()=>{it("restores hypothesis values and history",async()=>{let state=startHypothesis(initialSkyscraper(puzzle));state=applyHypothesisSequence(puzzle,state,{axis:"row",unit:0},[1,2,3,4]);await saveSkyscraperSession(puzzle,state);const restored=await loadSkyscraperSession(puzzle);expect(restored?.hypothesis?.trialValues.slice(0,4)).toEqual([1,2,3,4]);expect(restored?.hypothesis?.history).toHaveLength(1);await deleteSkyscraperSession(puzzle.id)})});
