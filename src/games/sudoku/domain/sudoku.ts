export type Difficulty = "easy" | "medium" | "hard" | "generated";
export interface SudokuPuzzle {
  id: string;
  title: string;
  difficulty: Difficulty;
  givens: number[];
  solution: number[];
  generated?: boolean;
  estimatedDifficulty?: string;
}
export type InputMode = "value" | "note";
export type LogicalHintKind =
  | "naked-single"
  | "hidden-single-row"
  | "hidden-single-column"
  | "hidden-single-block";
export interface LogicalHint {
  index: number;
  digit: number;
  kind: LogicalHintKind;
  unitIndex: number;
  signature: string;
}
export type UnitKind = "row" | "column" | "block";
export interface NearCompleteUnit {
  kind: UnitKind;
  unitIndex: number;
  cells: number[];
  emptyIndex: number;
  missing: number[];
  valid: boolean;
}
export interface SudokuCheckpoint {
  values: number[];
  notes: number[][];
  selected: number | null;
  inputMode: InputMode;
  hinted: number[];
}
export interface SudokuState {
  values: number[];
  notes: number[][];
  selected: number | null;
  inputMode: InputMode;
  hinted: number[];
  hintCount: number;
  lightHint: { index: number; candidates: number[]; signature: string } | null;
  logicalHintSignature?: string | null;
  checkpoints: SudokuCheckpoint[];
}

export const peers = (index: number) => {
  const row = Math.floor(index / 9),
    column = index % 9,
    blockRow = Math.floor(row / 3) * 3,
    blockColumn = Math.floor(column / 3) * 3,
    result = new Set<number>();
  for (let n = 0; n < 9; n++) {
    result.add(row * 9 + n);
    result.add(n * 9 + column);
  }
  for (let r = blockRow; r < blockRow + 3; r++)
    for (let c = blockColumn; c < blockColumn + 3; c++) result.add(r * 9 + c);
  result.delete(index);
  return [...result];
};
export function initialSudoku(puzzle: SudokuPuzzle): SudokuState {
  return {
    values: [...puzzle.givens],
    notes: Array.from({ length: 81 }, () => []),
    selected: null,
    inputMode: "value",
    hinted: [],
    hintCount: 0,
    lightHint: null,
    checkpoints: [],
  };
}
export const isFixed = (
  puzzle: SudokuPuzzle,
  state: SudokuState,
  index: number,
) => puzzle.givens[index] !== 0 || state.hinted.includes(index);
export function candidates(values: number[], index: number) {
  if (values[index]) return [];
  const used = new Set(
    peers(index)
      .map((i) => values[i])
      .filter(Boolean),
  );
  return Array.from({ length: 9 }, (_, i) => i + 1).filter((n) => !used.has(n));
}
export function conflicts(values: number[]) {
  const result = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    for (const peer of peers(i))
      if (values[peer] === values[i]) {
        result.add(i);
        result.add(peer);
      }
  }
  return result;
}
export const isComplete = (state: SudokuState) =>
  state.values.every(Boolean) && conflicts(state.values).size === 0;
export function selectCell(state: SudokuState, index: number) {
  return state.selected === index
    ? state
    : { ...state, selected: index, lightHint: null };
}
export function setMode(state: SudokuState, inputMode: InputMode) {
  return { ...state, inputMode };
}
export function enterNumber(
  puzzle: SudokuPuzzle,
  state: SudokuState,
  value: number,
) {
  const index = state.selected;
  if (index === null || isFixed(puzzle, state, index) || value < 1 || value > 9)
    return state;
  if (state.inputMode === "note") {
    if (state.values[index]) return state;
    const notes = state.notes.map((list) => [...list]),
      set = new Set(notes[index]);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    notes[index] = [...set].sort();
    return { ...state, notes, lightHint: null };
  }
  const values = [...state.values],
    notes = state.notes.map((list) => [...list]);
  values[index] = value;
  notes[index] = [];
  for (const peer of peers(index))
    notes[peer] = notes[peer].filter((n) => n !== value);
  return { ...state, values, notes, lightHint: null };
}
export function clearCell(puzzle: SudokuPuzzle, state: SudokuState) {
  const index = state.selected;
  if (index === null || isFixed(puzzle, state, index)) return state;
  const values = [...state.values],
    notes = state.notes.map((list) => [...list]);
  values[index] = 0;
  notes[index] = [];
  return { ...state, values, notes, lightHint: null };
}
export function lightHint(state: SudokuState) {
  if (state.selected === null) return state;
  const found = candidates(state.values, state.selected),
    signature = `${state.selected}:${state.values.join("")}`;
  if (state.lightHint?.signature === signature) return state;
  return {
    ...state,
    lightHint: { index: state.selected, candidates: found, signature },
    hintCount: state.hintCount + 1,
  };
}
export const unitCells = (kind: UnitKind, unitIndex: number) =>
  Array.from({ length: 9 }, (_, offset) =>
    kind === "row"
      ? unitIndex * 9 + offset
      : kind === "column"
        ? offset * 9 + unitIndex
        : (Math.floor(unitIndex / 3) * 3 + Math.floor(offset / 3)) * 9 +
          (unitIndex % 3) * 3 +
          (offset % 3),
  );
export function nearCompleteUnits(values: number[]): NearCompleteUnit[] {
  const result: NearCompleteUnit[] = [];
  for (const kind of ["row", "column", "block"] as UnitKind[])
    for (let unitIndex = 0; unitIndex < 9; unitIndex++) {
      const cells = unitCells(kind, unitIndex),
        empty = cells.filter((index) => values[index] === 0);
      if (empty.length !== 1) continue;
      const present = cells.map((index) => values[index]).filter(Boolean),
        missing = Array.from({ length: 9 }, (_, index) => index + 1).filter(
          (digit) => !present.includes(digit),
        );
      result.push({
        kind,
        unitIndex,
        cells,
        emptyIndex: empty[0],
        missing,
        valid: new Set(present).size === 8 && missing.length === 1,
      });
    }
  return result;
}
export function nearCompletionForCell(values: number[], index: number) {
  return nearCompleteUnits(values).filter((unit) => unit.emptyIndex === index);
}
export function addCandidateNotes(state: SudokuState) {
  const index = state.selected;
  if (index === null || state.values[index]) return state;
  const notes = state.notes.map((list) => [...list]);
  notes[index] = candidates(state.values, index);
  return { ...state, notes, lightHint: null };
}
export function cleanCandidateNotes(state: SudokuState) {
  let removed = 0;
  const notes = state.notes.map((list, index) => {
    if (state.values[index]) {
      removed += list.length;
      return [];
    }
    const allowed = new Set(candidates(state.values, index)),
      next = list.filter((digit) => allowed.has(digit));
    removed += list.length - next.length;
    return next;
  });
  return {
    state: removed ? { ...state, notes, lightHint: null } : state,
    removed,
  };
}
export function findNakedSingle(values: number[]): LogicalHint | null {
  for (let index = 0; index < 81; index++) {
    const found = candidates(values, index);
    if (found.length === 1)
      return {
        index,
        digit: found[0],
        kind: "naked-single",
        unitIndex: -1,
        signature: `naked-single:${index}:${found[0]}:${values.join("")}`,
      };
  }
  return null;
}
export function findHiddenSingle(
  values: number[],
  unitKind: "row" | "column" | "block",
): LogicalHint | null {
  const matches: LogicalHint[] = [];
  for (let unitIndex = 0; unitIndex < 9; unitIndex++) {
    const cells = unitCells(unitKind, unitIndex);
    for (let digit = 1; digit <= 9; digit++) {
      if (cells.some((index) => values[index] === digit)) continue;
      const eligible = cells.filter(
        (index) =>
          values[index] === 0 && candidates(values, index).includes(digit),
      );
      if (eligible.length === 1)
        matches.push({
          index: eligible[0],
          digit,
          kind: `hidden-single-${unitKind}` as LogicalHintKind,
          unitIndex,
          signature: `hidden-single-${unitKind}:${eligible[0]}:${digit}:${values.join("")}`,
        });
    }
  }
  return (
    matches.sort((a, b) => a.index - b.index || a.digit - b.digit)[0] ?? null
  );
}
export function findLogicalHint(values: number[]): LogicalHint | null {
  return (
    findNakedSingle(values) ??
    findHiddenSingle(values, "row") ??
    findHiddenSingle(values, "column") ??
    findHiddenSingle(values, "block")
  );
}
export function applyLogicalHint(state: SudokuState, hint: LogicalHint) {
  return {
    ...state,
    selected: hint.index,
    lightHint: null,
    logicalHintSignature: hint.signature,
    hintCount:
      state.logicalHintSignature === hint.signature
        ? state.hintCount
        : state.hintCount + 1,
  };
}
export function logicalHintScope(hint: LogicalHint) {
  if (hint.kind === "naked-single") return peers(hint.index);
  const kind = hint.kind.replace("hidden-single-", "") as
    | "row"
    | "column"
    | "block";
  return unitCells(kind, hint.unitIndex);
}
export function revealHint(
  puzzle: SudokuPuzzle,
  state: SudokuState,
  preferred?: number,
) {
  const eligible = state.values
    .map((v, i) => ({ v, i }))
    .filter(
      ({ v, i }) =>
        puzzle.givens[i] === 0 &&
        !state.hinted.includes(i) &&
        v !== puzzle.solution[i],
    );
  if (!eligible.length) return state;
  const index =
      preferred !== undefined && eligible.some((item) => item.i === preferred)
        ? preferred
        : eligible[0].i,
    values = [...state.values],
    notes = state.notes.map((list) => [...list]);
  values[index] = puzzle.solution[index];
  notes[index] = [];
  for (const peer of peers(index))
    notes[peer] = notes[peer].filter((n) => n !== values[index]);
  return {
    ...state,
    values,
    notes,
    hinted: [...state.hinted, index],
    hintCount: state.hintCount + 1,
    selected: index,
    lightHint: null,
  };
}
export function createCheckpoint(state: SudokuState) {
  if (state.checkpoints.length >= 3) return state;
  const snapshot: SudokuCheckpoint = {
    values: [...state.values],
    notes: state.notes.map((list) => [...list]),
    selected: state.selected,
    inputMode: state.inputMode,
    hinted: [...state.hinted],
  };
  return {
    ...state,
    checkpoints: [...state.checkpoints, snapshot],
    lightHint: null,
  };
}
export function restoreCheckpoint(state: SudokuState) {
  const checkpoint = state.checkpoints.at(-1);
  if (!checkpoint) return state;
  return {
    ...state,
    values: [...checkpoint.values],
    notes: checkpoint.notes.map((list) => [...list]),
    selected: checkpoint.selected,
    inputMode: checkpoint.inputMode,
    hinted: [...checkpoint.hinted],
    checkpoints: state.checkpoints.slice(0, -1),
    lightHint: null,
    logicalHintSignature: null,
  };
}
export function acceptCheckpoint(state: SudokuState) {
  if (!state.checkpoints.length) return state;
  return { ...state, checkpoints: state.checkpoints.slice(0, -1) };
}
export function cleanIncorrectEntries(
  puzzle: SudokuPuzzle,
  state: SudokuState,
) {
  let removed = 0;
  const values = state.values.map((value, index) => {
      if (
        value !== 0 &&
        puzzle.givens[index] === 0 &&
        value !== puzzle.solution[index]
      ) {
        removed++;
        return 0;
      }
      return value;
    }),
    notes = state.notes.map((list, index) =>
      state.values[index] !== 0 && values[index] === 0 ? [] : [...list],
    );
  return {
    state: {
      ...state,
      values,
      notes,
      checkpoints: [],
      hintCount: state.hintCount + 1,
      lightHint: null,
      logicalHintSignature: null,
    },
    removed,
  };
}
export function validateGrid(values: number[], complete = false) {
  if (
    values.length !== 81 ||
    values.some(
      (v) => !Number.isInteger(v) || v < 0 || v > 9 || (complete && v === 0),
    )
  )
    return false;
  return conflicts(values).size === 0;
}
