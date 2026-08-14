export type KakuroDifficulty = "easy" | "medium" | "generated";
export type RunDirection = "right" | "down";
export type InputMode = "value" | "note";
export type MemoLevel = "basic" | "run" | "cross";
export interface KakuroClue {
  index: number;
  right?: number;
  down?: number;
}
export interface KakuroPuzzle {
  id: string;
  title: string;
  difficulty: KakuroDifficulty;
  width: 5 | 7 | 9;
  height: 5 | 7 | 9;
  white: boolean[];
  clues: KakuroClue[];
  givens: number[];
  solution: number[];
  generated?: boolean;
  estimatedDifficulty?: string;
}
export interface KakuroRun {
  id: string;
  direction: RunDirection;
  clueIndex: number;
  total: number;
  cells: number[];
}
export interface KakuroHypothesis {
  trialValues: number[];
  history: number[][];
  selectedRunId: string | null;
}
export interface KakuroState {
  values: number[];
  notes: number[][];
  selected: number | null;
  inputMode: InputMode;
  hinted: number[];
  hintCount: number;
  hypothesis: KakuroHypothesis | null;
}
export interface KakuroAnalysis {
  domains: Map<string, number[][]>;
  cellCandidates: number[][];
  forced: { index: number; value: number }[];
  contradictionRunId: string | null;
}

const sequenceCache = new Map<string, number[][]>();
export function runSequences(length: number, total: number) {
  const key = `${length}:${total}`,
    cached = sequenceCache.get(key);
  if (cached) return cached;
  const result: number[][] = [];
  function visit(prefix: number[], used: Set<number>, sum: number) {
    if (prefix.length === length) {
      if (sum === total) result.push(prefix);
      return;
    }
    const remaining = length - prefix.length,
      minRest = remaining - 1;
    for (let value = 1; value <= 9; value++) {
      if (used.has(value) || (sum + value >= total && minRest > 0)) continue;
      const available = Array.from({ length: 9 }, (_, i) => i + 1)
        .filter((v) => !used.has(v) && v !== value)
        .sort((a, b) => a - b);
      const min =
          sum + value + available.slice(0, minRest).reduce((a, b) => a + b, 0),
        max =
          sum + value + available.slice(-minRest).reduce((a, b) => a + b, 0);
      if (total < min || total > max) continue;
      used.add(value);
      visit([...prefix, value], used, sum + value);
      used.delete(value);
    }
  }
  visit([], new Set(), 0);
  sequenceCache.set(key, result);
  return result;
}
export function buildRuns(
  puzzle: Pick<KakuroPuzzle, "width" | "height" | "white" | "clues">,
) {
  const result: KakuroRun[] = [];
  for (const clue of puzzle.clues)
    for (const direction of ["right", "down"] as RunDirection[]) {
      const total = clue[direction];
      if (!total) continue;
      const cells: number[] = [],
        step = direction === "right" ? 1 : puzzle.width;
      let index = clue.index + step;
      while (
        index >= 0 &&
        index < puzzle.white.length &&
        puzzle.white[index] &&
        (direction === "down" ||
          Math.floor(index / puzzle.width) ===
            Math.floor(clue.index / puzzle.width))
      ) {
        cells.push(index);
        index += step;
      }
      result.push({
        id: `${clue.index}:${direction}`,
        direction,
        clueIndex: clue.index,
        total,
        cells,
      });
    }
  return result;
}
export function runsForCell(puzzle: KakuroPuzzle, index: number) {
  return buildRuns(puzzle).filter((run) => run.cells.includes(index));
}
export const workingValues = (state: KakuroState) =>
  state.values.map(
    (value, index) => value || state.hypothesis?.trialValues[index] || 0,
  );
function notesMatch(
  sequence: number[],
  run: KakuroRun,
  values: number[],
  notes: number[][],
) {
  return sequence.every(
    (value, offset) =>
      values[run.cells[offset]] !== 0 ||
      notes[run.cells[offset]].length === 0 ||
      notes[run.cells[offset]].includes(value),
  );
}
export function runDomain(run: KakuroRun, values: number[], notes: number[][]) {
  return runSequences(run.cells.length, run.total).filter(
    (sequence) =>
      sequence.every(
        (value, offset) =>
          values[run.cells[offset]] === 0 ||
          values[run.cells[offset]] === value,
      ) && notesMatch(sequence, run, values, notes),
  );
}
export function analyzeDomains(
  puzzle: KakuroPuzzle,
  values: number[],
  notes: number[][],
  propagate = true,
): KakuroAnalysis {
  const runs = buildRuns(puzzle),
    domains = new Map(
      runs.map((run) => [run.id, runDomain(run, values, notes)]),
    ),
    byCell = Array.from({ length: values.length }, () => [] as KakuroRun[]);
  runs.forEach((run) => run.cells.forEach((index) => byCell[index].push(run)));
  let changed = propagate;
  while (changed) {
    changed = false;
    for (let index = 0; index < values.length; index++) {
      const touching = byCell[index];
      if (touching.length !== 2) continue;
      const [a, b] = touching,
        ao = a.cells.indexOf(index),
        bo = b.cells.indexOf(index),
        ad = domains.get(a.id)!,
        bd = domains.get(b.id)!,
        av = new Set(ad.map((sequence) => sequence[ao])),
        bv = new Set(bd.map((sequence) => sequence[bo])),
        nextA = ad.filter((sequence) => bv.has(sequence[ao])),
        nextB = bd.filter((sequence) => av.has(sequence[bo]));
      if (nextA.length !== ad.length) {
        domains.set(a.id, nextA);
        changed = true;
      }
      if (nextB.length !== bd.length) {
        domains.set(b.id, nextB);
        changed = true;
      }
    }
  }
  const contradiction =
      runs.find((run) => domains.get(run.id)!.length === 0)?.id ?? null,
    cellCandidates = Array.from({ length: values.length }, (_, index) => {
      if (!puzzle.white[index] || values[index]) return [];
      const touching = byCell[index];
      if (!touching.length) return [];
      let possible = new Set(Array.from({ length: 9 }, (_, i) => i + 1));
      for (const run of touching) {
        const offset = run.cells.indexOf(index),
          allowed = new Set(
            domains.get(run.id)!.map((sequence) => sequence[offset]),
          );
        possible = new Set([...possible].filter((value) => allowed.has(value)));
      }
      return [...possible].sort();
    }),
    forced = cellCandidates.flatMap((items, index) =>
      items.length === 1 ? [{ index, value: items[0] }] : [],
    );
  return { domains, cellCandidates, forced, contradictionRunId: contradiction };
}
export function initialKakuro(puzzle: KakuroPuzzle): KakuroState {
  return {
    values: [...puzzle.givens],
    notes: Array.from({ length: puzzle.white.length }, () => []),
    selected: null,
    inputMode: "value",
    hinted: [],
    hintCount: 0,
    hypothesis: null,
  };
}
export const isFixed = (
  puzzle: KakuroPuzzle,
  state: KakuroState,
  index: number,
) => puzzle.givens[index] !== 0 || state.hinted.includes(index);
export function conflicts(puzzle: KakuroPuzzle, values: number[]) {
  const result = new Set<number>();
  for (const run of buildRuns(puzzle)) {
    const positions = new Map<number, number[]>();
    run.cells.forEach((index) => {
      const value = values[index];
      if (value) positions.set(value, [...(positions.get(value) ?? []), index]);
    });
    positions.forEach((indices) => {
      if (indices.length > 1) indices.forEach((index) => result.add(index));
    });
  }
  return result;
}
export function runStatus(values: number[], run: KakuroRun) {
  const domain = runDomain(
    run,
    values,
    Array.from({ length: values.length }, () => []),
  );
  if (!domain.length) return "impossible" as const;
  return run.cells.every((index) => values[index])
    ? ("satisfied" as const)
    : ("open" as const);
}
export function basicCandidates(
  puzzle: KakuroPuzzle,
  values: number[],
  index: number,
) {
  if (!puzzle.white[index] || values[index]) return [];
  return Array.from({ length: 9 }, (_, i) => i + 1).filter((value) =>
    runsForCell(puzzle, index).every((run) => {
      const used = new Set(
          run.cells.map((cell) => values[cell]).filter(Boolean),
        ),
        current = run.cells.reduce((sum, cell) => sum + values[cell], 0),
        remaining = run.cells.filter((cell) => !values[cell]).length;
      return (
        !used.has(value) &&
        current + value <= (remaining === 1 ? run.total : run.total - 1)
      );
    }),
  );
}
export function candidates(
  puzzle: KakuroPuzzle,
  state: KakuroState,
  index: number,
  level: MemoLevel = "cross",
) {
  const values = workingValues(state);
  if (level === "basic") return basicCandidates(puzzle, values, index);
  return analyzeDomains(puzzle, values, state.notes, level === "cross")
    .cellCandidates[index];
}
export function enterNumber(
  puzzle: KakuroPuzzle,
  state: KakuroState,
  value: number,
) {
  const index = state.selected;
  if (
    index === null ||
    !puzzle.white[index] ||
    isFixed(puzzle, state, index) ||
    value < 1 ||
    value > 9
  )
    return state;
  const notes = state.notes.map((item) => [...item]);
  if (state.inputMode === "note") {
    if (state.values[index]) return state;
    const set = new Set(notes[index]);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    notes[index] = [...set].sort();
    return { ...state, notes };
  }
  const values = [...state.values];
  values[index] = value;
  notes[index] = [];
  runsForCell(puzzle, index)
    .flatMap((run) => run.cells)
    .forEach((peer) => {
      if (peer !== index)
        notes[peer] = notes[peer].filter((digit) => digit !== value);
    });
  return { ...state, values, notes };
}
export function clearCell(puzzle: KakuroPuzzle, state: KakuroState) {
  if (
    state.selected === null ||
    isFixed(puzzle, state, state.selected) ||
    !puzzle.white[state.selected]
  )
    return state;
  const values = [...state.values],
    notes = state.notes.map((item) => [...item]);
  values[state.selected] = 0;
  notes[state.selected] = [];
  return { ...state, values, notes };
}
export function addCandidateNotes(
  puzzle: KakuroPuzzle,
  state: KakuroState,
  level: MemoLevel,
) {
  if (state.selected === null || state.values[state.selected]) return state;
  const notes = state.notes.map((item) => [...item]);
  notes[state.selected] = candidates(puzzle, state, state.selected, level);
  return { ...state, notes };
}
export function cleanCandidateNotes(
  puzzle: KakuroPuzzle,
  state: KakuroState,
  level: MemoLevel,
) {
  let removed = 0;
  const notes = state.notes.map((item, index) => {
    if (!item.length) return item;
    const allowed = new Set(candidates(puzzle, state, index, level)),
      next = item.filter((value) => allowed.has(value));
    removed += item.length - next.length;
    return next;
  });
  return { state: removed ? { ...state, notes } : state, removed };
}
export function revealHint(puzzle: KakuroPuzzle, state: KakuroState) {
  const eligible = state.values
    .map((value, index) => ({ value, index }))
    .filter(
      ({ value, index }) =>
        puzzle.white[index] &&
        !isFixed(puzzle, state, index) &&
        value !== puzzle.solution[index],
    );
  if (!eligible.length) return state;
  const item =
      eligible.find(({ index }) => index === state.selected) ?? eligible[0],
    values = [...state.values],
    notes = state.notes.map((list) => [...list]);
  values[item.index] = puzzle.solution[item.index];
  notes[item.index] = [];
  return {
    ...state,
    values,
    notes,
    selected: item.index,
    hinted: [...state.hinted, item.index],
    hintCount: state.hintCount + 1,
  };
}
export function isComplete(puzzle: KakuroPuzzle, state: KakuroState) {
  const values = state.values;
  if (
    puzzle.white.some((white, index) => white && !values[index]) ||
    conflicts(puzzle, values).size
  )
    return false;
  return buildRuns(puzzle).every(
    (run) =>
      run.cells.reduce((sum, index) => sum + values[index], 0) === run.total,
  );
}
export function startHypothesis(state: KakuroState) {
  return state.hypothesis
    ? state
    : {
        ...state,
        inputMode: "value" as const,
        hypothesis: {
          trialValues: Array(state.values.length).fill(0),
          history: [],
          selectedRunId: null,
        },
      };
}
export const discardHypothesis = (state: KakuroState) =>
  state.hypothesis ? { ...state, hypothesis: null } : state;
export function selectHypothesisRun(state: KakuroState, runId: string) {
  return state.hypothesis
    ? { ...state, hypothesis: { ...state.hypothesis, selectedRunId: runId } }
    : state;
}
function pushTrial(state: KakuroState, trialValues: number[]) {
  return state.hypothesis
    ? {
        ...state,
        hypothesis: {
          ...state.hypothesis,
          trialValues,
          history: [
            ...state.hypothesis.history,
            [...state.hypothesis.trialValues],
          ],
        },
      }
    : state;
}
export function hypothesisSequences(
  puzzle: KakuroPuzzle,
  state: KakuroState,
  runId: string,
) {
  const values = workingValues(state),
    runs = buildRuns(puzzle),
    run = runs.find((item) => item.id === runId);
  if (!run) return [];
  return runDomain(run, values, state.notes).filter((sequence) => {
    const next = [...values];
    run.cells.forEach((index, offset) => {
      if (!state.values[index]) next[index] = sequence[offset];
    });
    return run.cells.every((index) =>
      runs
        .filter((item) => item.id !== run.id && item.cells.includes(index))
        .every((cross) => runDomain(cross, next, state.notes).length > 0),
    );
  });
}
export function applyHypothesisSequence(
  puzzle: KakuroPuzzle,
  state: KakuroState,
  runId: string,
  sequence: number[],
) {
  const run = buildRuns(puzzle).find((item) => item.id === runId);
  if (!state.hypothesis || !run || sequence.length !== run.cells.length)
    return state;
  const trial = [...state.hypothesis.trialValues];
  run.cells.forEach((index, offset) => {
    if (!state.values[index]) trial[index] = sequence[offset];
  });
  return pushTrial(selectHypothesisRun(state, runId), trial);
}
export function enterHypothesisNumber(
  puzzle: KakuroPuzzle,
  state: KakuroState,
  value: number,
) {
  if (
    !state.hypothesis ||
    state.selected === null ||
    !puzzle.white[state.selected] ||
    state.values[state.selected] ||
    value < 1 ||
    value > 9
  )
    return state;
  const trial = [...state.hypothesis.trialValues];
  trial[state.selected] = value;
  return pushTrial(state, trial);
}
export function clearHypothesisCell(state: KakuroState) {
  if (
    !state.hypothesis ||
    state.selected === null ||
    !state.hypothesis.trialValues[state.selected]
  )
    return state;
  const trial = [...state.hypothesis.trialValues];
  trial[state.selected] = 0;
  return pushTrial(state, trial);
}
export function applyHypothesisValues(
  state: KakuroState,
  items: { index: number; value: number }[],
) {
  if (!state.hypothesis || !items.length) return state;
  const trial = [...state.hypothesis.trialValues];
  items.forEach((item) => {
    if (!state.values[item.index]) trial[item.index] = item.value;
  });
  return pushTrial(state, trial);
}
export function undoHypothesis(state: KakuroState) {
  if (!state.hypothesis?.history.length) return state;
  const history = [...state.hypothesis.history],
    trialValues = history.pop()!;
  return {
    ...state,
    hypothesis: { ...state.hypothesis, history, trialValues },
  };
}
export function resetHypothesis(state: KakuroState) {
  return state.hypothesis
    ? {
        ...state,
        hypothesis: {
          ...state.hypothesis,
          trialValues: Array(state.values.length).fill(0),
          history: [],
        },
      }
    : state;
}
export function commitHypothesis(state: KakuroState) {
  if (!state.hypothesis) return state;
  const values = workingValues(state),
    notes = state.notes.map((item, index) => (values[index] ? [] : [...item]));
  return { ...state, values, notes, hypothesis: null };
}
