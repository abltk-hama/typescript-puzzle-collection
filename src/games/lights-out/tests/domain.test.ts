import { describe, expect, it } from "vitest";
import { applyPress, applyPreview, effectiveMoveCount, initialGame, isComplete, nextHint, oddPositions, press, previewCells, restore, undo, type LightsOutPuzzle } from "../domain/lightsOut";
import { generateLightsOut } from "../generation/generate";

const puzzle:LightsOutPuzzle={id:"test",title:"Test",difficulty:"easy",width:5,height:5,initialState:Array(25).fill(false),oneSolutionMoves:[{row:2,column:2}],metadata:{}};

describe("Lights Out domain",()=>{
  it("toggles a cross and undo restores the board while retaining attempts",()=>{const start=initialGame(puzzle),moved=press(start,{row:2,column:2}),undone=undo(moved);expect(moved.cells.filter(Boolean)).toHaveLength(5);expect(undone.cells).toEqual(start.cells);expect(undone.history).toEqual([]);expect(undone.attemptCount).toBe(1)});
  it("handles corner boundaries",()=>{const cells=Array(25).fill(false);applyPress(cells,{row:0,column:0});expect(cells.filter(Boolean)).toHaveLength(3)});
  it("combines chained previews with XOR and removes even duplicate centers",()=>{const center={row:2,column:2},right={row:2,column:3},preview=previewCells(Array(25).fill(false),[center,right,center]);expect(preview).toEqual(previewCells(Array(25).fill(false),[right]));expect(oddPositions([center,right,center])).toEqual([right])});
  it("applies only effective preview moves and counts attempts according to policy",()=>{const center={row:2,column:2},right={row:2,column:3},base={...initialGame(puzzle),attemptCount:3},included=applyPreview(base,[center,right,center],false),excluded=applyPreview(initialGame(puzzle),[center,right,center],true);expect(included.history).toEqual([right]);expect(included.attemptCount).toBe(3);expect(excluded.attemptCount).toBe(1);expect(effectiveMoveCount(included)).toBe(1)});
  it("counts a repeated hint once",()=>{const first=nextHint(puzzle,initialGame(puzzle));expect(first.hintCount).toBe(1);expect(nextHint(puzzle,first)).toBe(first)});
  it("migrates attempt count in old saved states",()=>{const old=press(initialGame(puzzle),{row:1,column:1});const restored=restore(puzzle,{...old,attemptCount:undefined as unknown as number});expect(restored.attemptCount).toBe(1)});
  it("generated puzzle has a known solution",()=>{const generated=generateLightsOut(42,"challenge");let state=initialGame(generated);generated.oneSolutionMoves.forEach(move=>state=press(state,move));expect(isComplete(state)).toBe(true)});
  it("generation is deterministic for a seed",()=>expect(generateLightsOut(9,"light")).toEqual(generateLightsOut(9,"light")));
});
