export interface Position { row: number; column: number }
export interface LightsOutPuzzle { id: string; title: string; difficulty: 'easy'|'medium'|'hard'|'generated'; width: 5; height: 5; initialState: boolean[]; oneSolutionMoves: Position[]; metadata: Record<string, unknown> }
export interface LightsOutState { cells: boolean[]; history: Position[]; hint: Position|null; hintCount: number; attemptCount: number }

export const positionKey=(position:Position)=>`${position.row},${position.column}`
export function affectedIndices(position:Position){const result:number[]=[];for(const[dr,dc]of[[0,0],[-1,0],[1,0],[0,-1],[0,1]]){const row=position.row+dr,column=position.column+dc;if(row>=0&&row<5&&column>=0&&column<5)result.push(row*5+column)}return result}
export function applyPress(cells:boolean[],position:Position){for(const index of affectedIndices(position))cells[index]=!cells[index]}
export function initialGame(puzzle:LightsOutPuzzle):LightsOutState{return{cells:[...puzzle.initialState],history:[],hint:null,hintCount:0,attemptCount:0}}
export function press(state:LightsOutState,position:Position,attempts=1):LightsOutState{const cells=[...state.cells];applyPress(cells,position);return{...state,cells,history:[...state.history,position],hint:null,attemptCount:state.attemptCount+attempts}}
export function undo(state:LightsOutState):LightsOutState{if(!state.history.length)return state;const history=state.history.slice(0,-1),cells=[...state.cells];applyPress(cells,state.history.at(-1)!);return{...state,cells,history,hint:null}}
export function oddPositions(positions:Position[]){const parity=new Map<string,Position>();for(const position of positions){const key=positionKey(position);if(parity.has(key))parity.delete(key);else parity.set(key,position)}return[...parity.values()]}
export const effectiveMoveCount=(state:LightsOutState)=>oddPositions(state.history).length
export function previewCells(cells:boolean[],positions:Position[]){const result=[...cells];for(const position of oddPositions(positions))applyPress(result,position);return result}
export function applyPreview(state:LightsOutState,positions:Position[],countAppliedAttempts:boolean){let next=state;const effective=oddPositions(positions);for(const position of effective)next=press(next,position,0);return{...next,attemptCount:state.attemptCount+(countAppliedAttempts?effective.length:0)}}
export const isComplete=(state:LightsOutState)=>!state.cells.some(Boolean)
export function nextHint(puzzle:LightsOutPuzzle,state:LightsOutState):LightsOutState{if(state.hint)return state;const parity=new Set(oddPositions(state.history).map(positionKey));for(const move of puzzle.oneSolutionMoves){const key=positionKey(move);if(parity.has(key))parity.delete(key);else parity.add(key)}const key=parity.values().next().value as string|undefined;if(!key)return state;const[row,column]=key.split(',').map(Number);return{...state,hint:{row,column},hintCount:state.hintCount+1}}
export function restore(puzzle:LightsOutPuzzle,state:LightsOutState){const migrated={...state,attemptCount:Number.isInteger(state.attemptCount)?state.attemptCount:state.history.length};let replay=[...puzzle.initialState];for(const move of migrated.history)applyPress(replay,move);if(replay.some((value,index)=>value!==migrated.cells[index]))throw new Error('保存状態と操作履歴が一致しません。');return migrated}
