export type Difficulty = "easy" | "medium" | "hard";
export type CellState = 0 | 1 | 2;
export interface NonogramPuzzle {
  id: string;
  title: string;
  difficulty: Difficulty;
  width: 5 | 10;
  height: 5 | 10;
  rowClues: number[][];
  columnClues: number[][];
  solution: boolean[];
  generated?: boolean;
  estimatedDifficulty?: Difficulty;
}
export interface StrokeChange {
  index: number;
  before: CellState;
  after: CellState;
}
export interface NonogramState {
  cells: CellState[];
  history: StrokeChange[][];
  inputMode: 1 | 2;
  selected: number | null;
  hinted: number[];
  hintCount: number;
  logicalHintSignature?: string | null;
}
export type LineStatus = "incomplete" | "complete" | "contradiction";
export interface NonogramLogicalHint { index: number; value: 1 | 2; kind: "row" | "column"; line: number; signature: string }

export function cluesForLine(line: boolean[]) {
  const clues: number[] = [];
  let run = 0;
  for (const value of line) {
    if (value) run++;
    else if (run) {
      clues.push(run);
      run = 0;
    }
  }
  if (run) clues.push(run);
  return clues;
}
export function cluesForSolution(
  solution: boolean[],
  width: number,
  height: number,
) {
  const rows = Array.from({ length: height }, (_, row) =>
      cluesForLine(solution.slice(row * width, (row + 1) * width)),
    ),
    columns = Array.from({ length: width }, (_, column) =>
      cluesForLine(
        Array.from(
          { length: height },
          (_, row) => solution[row * width + column],
        ),
      ),
    );
  return { rows, columns };
}
export function initialNonogram(puzzle: NonogramPuzzle): NonogramState {
  return {
    cells: Array(puzzle.width * puzzle.height).fill(0),
    history: [],
    inputMode: 1,
    selected: null,
    hinted: [],
    hintCount: 0,
  };
}
export const isComplete = (puzzle: NonogramPuzzle, state: NonogramState) =>
  state.cells.every((cell, index) => (cell === 1) === puzzle.solution[index]);
export const hasProgress = (state: NonogramState) =>
  state.cells.some(Boolean) || state.hinted.length > 0;
export function lineComplete(
  puzzle: NonogramPuzzle,
  state: NonogramState,
  kind: "row" | "column",
  line: number,
) {
  const length = kind === "row" ? puzzle.width : puzzle.height;
  return Array.from({ length }, (_, offset) =>
    kind === "row"
      ? line * puzzle.width + offset
      : offset * puzzle.width + line,
  ).every((index) => (state.cells[index] === 1) === puzzle.solution[index]);
}
function patterns(length:number,clues:number[]){const result:boolean[][]=[];function place(clueIndex:number,start:number,line:boolean[]){if(clueIndex===clues.length){result.push(line);return}const remaining=clues.slice(clueIndex+1).reduce((a,b)=>a+b,0)+Math.max(0,clues.length-clueIndex-1);for(let position=start;position+clues[clueIndex]+remaining<=length;position++){const next=[...line];for(let i=0;i<clues[clueIndex];i++)next[position+i]=true;place(clueIndex+1,position+clues[clueIndex]+1,next)}}if(!clues.length)return[Array(length).fill(false)];place(0,0,Array(length).fill(false));return result}
export function lineIndices(puzzle:NonogramPuzzle,kind:"row"|"column",line:number){const length=kind==="row"?puzzle.width:puzzle.height;return Array.from({length},(_,offset)=>kind==="row"?line*puzzle.width+offset:offset*puzzle.width+line)}
export function compatibleLinePatterns(puzzle:NonogramPuzzle,state:NonogramState,kind:"row"|"column",line:number){const indices=lineIndices(puzzle,kind,line),clues=kind==="row"?puzzle.rowClues[line]:puzzle.columnClues[line];return patterns(indices.length,clues).filter(pattern=>pattern.every((filled,offset)=>state.cells[indices[offset]]===0||(state.cells[indices[offset]]===1)===filled))}
export function lineStatus(puzzle:NonogramPuzzle,state:NonogramState,kind:"row"|"column",line:number):LineStatus{const options=compatibleLinePatterns(puzzle,state,kind,line);if(!options.length)return"contradiction";return lineIndices(puzzle,kind,line).every(index=>state.cells[index]!==0)&&options.length===1?"complete":"incomplete"}
export function findNonogramLogicalHint(puzzle:NonogramPuzzle,state:NonogramState):NonogramLogicalHint|null{for(const kind of["row","column"] as const){const count=kind==="row"?puzzle.height:puzzle.width;for(let line=0;line<count;line++){const indices=lineIndices(puzzle,kind,line),options=compatibleLinePatterns(puzzle,state,kind,line);if(!options.length)continue;for(let offset=0;offset<indices.length;offset++){const index=indices[offset];if(state.cells[index]!==0)continue;const first=options[0][offset];if(options.every(pattern=>pattern[offset]===first))return{index,value:first?1:2,kind,line,signature:`${kind}:${line}:${index}:${first?1:2}:${state.cells.join("")}`}}}}return null}
export function hasLineContradiction(puzzle:NonogramPuzzle,state:NonogramState){return puzzle.rowClues.some((_,line)=>lineStatus(puzzle,state,"row",line)==="contradiction")||puzzle.columnClues.some((_,line)=>lineStatus(puzzle,state,"column",line)==="contradiction")}
export function applyStroke(
  puzzle: NonogramPuzzle,
  state: NonogramState,
  indices: number[],
  target: 1 | 2 = state.inputMode,
) {
  if (isComplete(puzzle, state) || !indices.length) return state;
  const unique = [...new Set(indices)],
    rows = new Set(unique.map((i) => Math.floor(i / puzzle.width))),
    columns = new Set(unique.map((i) => i % puzzle.width));
  if (rows.size > 1 && columns.size > 1) return state;
  const coordinates = unique
    .map((i) =>
      rows.size === 1 ? i % puzzle.width : Math.floor(i / puzzle.width),
    )
    .sort((a, b) => a - b);
  if (
    coordinates.some(
      (value, index) => index > 0 && value !== coordinates[index - 1] + 1,
    )
  )
    return state;
  const desired: CellState = state.cells[unique[0]] === target ? 0 : target,
    cells = [...state.cells],
    changes: StrokeChange[] = [];
  for (const index of unique) {
    if (index < 0 || index >= cells.length || state.hinted.includes(index))
      continue;
    const before = cells[index];
    if (before !== desired) {
      cells[index] = desired;
      changes.push({ index, before, after: desired });
    }
  }
  return changes.length
    ? {
        ...state,
        cells,
        history: [...state.history, changes],
        selected: unique.at(-1) ?? state.selected,
      }
    : state;
}
export function undoStroke(puzzle: NonogramPuzzle, state: NonogramState) {
  if (isComplete(puzzle, state) || !state.history.length) return state;
  const history = state.history.slice(0, -1),
    cells = [...state.cells];
  for (const change of [...state.history.at(-1)!].reverse())
    if (!state.hinted.includes(change.index))
      cells[change.index] = change.before;
  return { ...state, cells, history };
}
export function revealCell(
  puzzle: NonogramPuzzle,
  state: NonogramState,
  preferred?: number,
) {
  const eligible = state.cells
    .map((cell, index) => ({ cell, index }))
    .filter(
      ({ cell, index }) =>
        !state.hinted.includes(index) &&
        cell !== (puzzle.solution[index] ? 1 : 2),
    );
  if (!eligible.length) return state;
  if (
    preferred !== undefined &&
    !eligible.some((item) => item.index === preferred)
  )
    return state;
  const index = preferred ?? eligible[0].index,
    cells = [...state.cells];
  cells[index] = puzzle.solution[index] ? 1 : 2;
  return {
    ...state,
    cells,
    hinted: [...state.hinted, index],
    hintCount: state.hintCount + 1,
    selected: index,
  };
}
export function validatePuzzle(puzzle: NonogramPuzzle) {
  if (
    !puzzle.id.trim() ||
    !puzzle.title.trim() ||
    ![5, 10].includes(puzzle.width) ||
    puzzle.width !== puzzle.height ||
    puzzle.solution.length !== puzzle.width * puzzle.height
  )
    return false;
  if (
    puzzle.rowClues.length !== puzzle.height ||
    puzzle.columnClues.length !== puzzle.width
  )
    return false;
  const valid = (lines: number[][], length: number) =>
    lines.every(
      (line) =>
        line.every((value) => Number.isInteger(value) && value > 0) &&
        line.reduce((a, b) => a + b, 0) + Math.max(0, line.length - 1) <=
          length,
    );
  if (
    !valid(puzzle.rowClues, puzzle.width) ||
    !valid(puzzle.columnClues, puzzle.height)
  )
    return false;
  const expected = cluesForSolution(
    puzzle.solution,
    puzzle.width,
    puzzle.height,
  );
  return (
    JSON.stringify(expected.rows) === JSON.stringify(puzzle.rowClues) &&
    JSON.stringify(expected.columns) === JSON.stringify(puzzle.columnClues)
  );
}
