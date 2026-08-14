export interface GuessResult {
  code: number[];
  exact: number;
  misplaced: number;
}
export interface MastermindPuzzle {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | "generated";
  codeLength: number;
  symbolCount: number;
  allowDuplicates: boolean;
  maxAttempts: number;
  secret: number[];
  metadata: Record<string, unknown>;
}
export type ColorMemoStatus = "unknown" | "likely" | "unlikely";
export interface MastermindState {
  current: (number | null)[];
  selected: number;
  guesses: GuessResult[];
  revealed: Record<number, number>;
  hintCount: number;
  lastCandidateRevision: [number, number] | null;
  positionNotes: number[][];
  colorNotes: Record<number, ColorMemoStatus>;
  pinnedGuesses: number[];
  guessNotes: Record<number, string>;
  memoHintSignatures: string[];
  informationHintSignatures: string[];
}
export function scoreGuess(
  secret: number[],
  guess: number[],
): [number, number] {
  let exact = 0,
    matched = 0;
  const secretCounts = new Map<number, number>(),
    guessCounts = new Map<number, number>();
  secret.forEach((value, index) => {
    if (value === guess[index]) exact++;
    secretCounts.set(value, (secretCounts.get(value) ?? 0) + 1);
  });
  guess.forEach((value) =>
    guessCounts.set(value, (guessCounts.get(value) ?? 0) + 1),
  );
  for (const [value, count] of secretCounts)
    matched += Math.min(count, guessCounts.get(value) ?? 0);
  return [exact, matched - exact];
}
export const initialGame = (puzzle: MastermindPuzzle): MastermindState => ({
  current: Array(puzzle.codeLength).fill(null),
  selected: 0,
  guesses: [],
  revealed: {},
  hintCount: 0,
  lastCandidateRevision: null,
  positionNotes: Array.from({ length: puzzle.codeLength }, () => []),
  colorNotes: {},
  pinnedGuesses: [],
  guessNotes: {},
  memoHintSignatures: [],
  informationHintSignatures: [],
});
export const isWon = (puzzle: MastermindPuzzle, state: MastermindState) =>
  state.guesses.at(-1)?.exact === puzzle.codeLength;
export const isLost = (puzzle: MastermindPuzzle, state: MastermindState) =>
  state.guesses.length >= puzzle.maxAttempts && !isWon(puzzle, state);
export const isFinished = (puzzle: MastermindPuzzle, state: MastermindState) =>
  isWon(puzzle, state) || isLost(puzzle, state);
export function selectPosition(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  index: number,
) {
  return index >= 0 && index < puzzle.codeLength
    ? { ...state, selected: index }
    : state;
}
export function setSymbol(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  value: number,
): MastermindState {
  if (
    isFinished(puzzle, state) ||
    state.revealed[state.selected] !== undefined ||
    value < 1 ||
    value > puzzle.symbolCount
  )
    return state;
  if (
    !puzzle.allowDuplicates &&
    state.current.includes(value) &&
    state.current[state.selected] !== value
  )
    return state;
  const current = [...state.current];
  current[state.selected] = value;
  let selected = state.selected;
  for (let index = state.selected + 1; index < puzzle.codeLength; index++)
    if (state.revealed[index] === undefined && current[index] === null) {
      selected = index;
      break;
    }
  return { ...state, current, selected };
}
export function clearSelected(
  puzzle: MastermindPuzzle,
  state: MastermindState,
) {
  if (
    isFinished(puzzle, state) ||
    state.revealed[state.selected] !== undefined ||
    state.current[state.selected] === null
  )
    return state;
  const current = [...state.current];
  current[state.selected] = null;
  return { ...state, current };
}
export function submitGuess(
  puzzle: MastermindPuzzle,
  state: MastermindState,
): MastermindState {
  if (
    isFinished(puzzle, state) ||
    state.current.some((value) => value === null)
  )
    return state;
  const code = state.current as number[],
    [exact, misplaced] = scoreGuess(puzzle.secret, code),
    guesses = [...state.guesses, { code: [...code], exact, misplaced }],
    current = Array.from(
      { length: puzzle.codeLength },
      (_, index) => state.revealed[index] ?? null,
    ),
    selected =
      Array.from({ length: puzzle.codeLength }, (_, index) => index).find(
        (index) => state.revealed[index] === undefined,
      ) ?? 0;
  return { ...state, current, selected, guesses };
}
export function revealPosition(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  index = state.selected,
) {
  if (
    isFinished(puzzle, state) ||
    index < 0 ||
    index >= puzzle.codeLength ||
    state.revealed[index] !== undefined
  )
    return state;
  const revealed = { ...state.revealed, [index]: puzzle.secret[index] },
    current = [...state.current];
  current[index] = puzzle.secret[index];
  return { ...state, revealed, current, hintCount: state.hintCount + 1 };
}
function* codes(
  puzzle: MastermindPuzzle,
  prefix: number[] = [],
): Generator<number[]> {
  if (prefix.length === puzzle.codeLength) {
    yield prefix;
    return;
  }
  for (let value = 1; value <= puzzle.symbolCount; value++) {
    if (!puzzle.allowDuplicates && prefix.includes(value)) continue;
    yield* codes(puzzle, [...prefix, value]);
  }
}
export function consistentCandidates(
  puzzle: MastermindPuzzle,
  state: MastermindState,
) {
  const result: number[][] = [];
  for (const candidate of codes(puzzle)) {
    if (
      Object.entries(state.revealed).some(
        ([index, value]) => candidate[Number(index)] !== value,
      )
    )
      continue;
    if (
      state.guesses.every((guess) => {
        const [exact, misplaced] = scoreGuess(candidate, guess.code);
        return exact === guess.exact && misplaced === guess.misplaced;
      })
    )
      result.push(candidate);
  }
  return result;
}
export function candidateCount(
  puzzle: MastermindPuzzle,
  state: MastermindState,
) {
  let count = 0;
  for (const candidate of codes(puzzle)) {
    if (
      Object.entries(state.revealed).some(
        ([index, value]) => candidate[Number(index)] !== value,
      )
    )
      continue;
    if (
      state.guesses.every((result) => {
        const [exact, misplaced] = scoreGuess(candidate, result.code);
        return exact === result.exact && misplaced === result.misplaced;
      })
    )
      count++;
  }
  const revision: [number, number] = [
      state.guesses.length,
      Object.keys(state.revealed).length,
    ],
    counted =
      !state.lastCandidateRevision ||
      state.lastCandidateRevision[0] !== revision[0] ||
      state.lastCandidateRevision[1] !== revision[1];
  return {
    count,
    counted,
    state: {
      ...state,
      hintCount: state.hintCount + (counted ? 1 : 0),
      lastCandidateRevision: revision,
    } as MastermindState,
  };
}
export function togglePositionNote(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  position: number,
  color: number,
) {
  if (
    position < 0 ||
    position >= puzzle.codeLength ||
    color < 1 ||
    color > puzzle.symbolCount
  )
    return state;
  const notes = state.positionNotes.map((list) => [...list]),
    set = new Set(notes[position]);
  if (set.has(color)) set.delete(color);
  else set.add(color);
  notes[position] = [...set].sort();
  return { ...state, positionNotes: notes };
}
export function cycleColorNote(state: MastermindState, color: number) {
  const current = state.colorNotes[color] ?? "unknown",
    next: ColorMemoStatus =
      current === "unknown"
        ? "likely"
        : current === "likely"
          ? "unlikely"
          : "unknown";
  return { ...state, colorNotes: { ...state.colorNotes, [color]: next } };
}
export function togglePin(state: MastermindState, index: number) {
  const found = state.pinnedGuesses.includes(index);
  if (!found && state.pinnedGuesses.length >= 2) return state;
  return {
    ...state,
    pinnedGuesses: found
      ? state.pinnedGuesses.filter((value) => value !== index)
      : [...state.pinnedGuesses, index],
  };
}
export function setGuessNote(
  state: MastermindState,
  index: number,
  note: string,
) {
  return {
    ...state,
    guessNotes: { ...state.guessNotes, [index]: note.slice(0, 40) },
  };
}
export function copyGuess(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  index: number,
) {
  const guess = state.guesses[index];
  if (!guess) return state;
  const current = guess.code.map(
    (value, position) => state.revealed[position] ?? value,
  );
  return {
    ...state,
    current,
    selected:
      Array.from({ length: puzzle.codeLength }, (_, i) => i).find(
        (i) => state.revealed[i] === undefined,
      ) ?? 0,
  };
}
export function classifyGuess(result: GuessResult) {
  return result.exact > 0 && result.misplaced > 0
    ? "both"
    : result.exact > 0
      ? "exact"
      : result.misplaced > 0
        ? "misplaced"
        : "none";
}
export function excludedColors(state: MastermindState) {
  return new Set(
    state.guesses
      .filter((result) => result.exact + result.misplaced === 0)
      .flatMap((result) => result.code),
  );
}
export function inputConsistency(state: MastermindState) {
  if (state.current.some((value) => value === null))
    return { consistent: true, conflicts: [] as number[] };
  const code = state.current as number[],
    conflicts = state.guesses
      .map((result, index) => {
        const [exact, misplaced] = scoreGuess(code, result.code);
        return exact === result.exact && misplaced === result.misplaced
          ? -1
          : index;
      })
      .filter((index) => index >= 0);
  return { consistent: conflicts.length === 0, conflicts };
}
export function guessComparisons(state: MastermindState) {
  const result: {
    left: number;
    right: number;
    changed: number[];
    common: { position: number; color: number }[];
    exactDelta: number;
    misplacedDelta: number;
    moved: number[];
  }[] = [];
  for (let left = 0; left < state.guesses.length; left++)
    for (let right = left + 1; right < state.guesses.length; right++) {
      const a = state.guesses[left],
        b = state.guesses[right],
        changed = a.code
          .map((value, index) => (value === b.code[index] ? -1 : index))
          .filter((index) => index >= 0);
      if (changed.length > 2) continue;
      result.push({
        left,
        right,
        changed,
        common: a.code
          .map((color, position) =>
            color === b.code[position] ? { position, color } : null,
          )
          .filter((value): value is { position: number; color: number } =>
            Boolean(value),
          ),
        exactDelta: b.exact - a.exact,
        misplacedDelta: b.misplaced - a.misplaced,
        moved: [
          ...new Set(
            a.code.filter(
              (color, index) =>
                b.code[index] !== color && b.code.includes(color),
            ),
          ),
        ],
      });
    }
  return result;
}
export function levelOneColors(state: MastermindState) {
  const excluded = excludedColors(state),
    references = new Map<number, number[]>();
  state.guesses.forEach((guess, index) => {
    if (guess.exact + guess.misplaced === 0) return;
    for (const color of new Set(guess.code))
      if (!excluded.has(color))
        references.set(color, [...(references.get(color) ?? []), index]);
  });
  return { excluded, references };
}
export function attentionGroups(
  puzzle: MastermindPuzzle,
  state: MastermindState,
) {
  const positions = Array.from(
      { length: puzzle.codeLength },
      () =>
        new Map<
          number,
          { strength: "normal" | "strong"; evidence: number[] }
        >(),
    ),
    unplaced = new Map<
      number,
      { strength: "normal" | "strong"; evidence: number[] }
    >(),
    comparisons = guessComparisons(state);
  for (const comparison of comparisons) {
    for (const common of comparison.common)
      positions[common.position].set(common.color, {
        strength: "normal",
        evidence: [comparison.left, comparison.right],
      });
    if (
      comparison.changed.length === 1 &&
      (comparison.exactDelta !== 0 || comparison.misplacedDelta !== 0)
    ) {
      const position = comparison.changed[0],
        color =
          state.guesses[
            comparison.exactDelta > 0 ? comparison.right : comparison.left
          ].code[position];
      positions[position].set(color, {
        strength: "strong",
        evidence: [comparison.left, comparison.right],
      });
    }
  }
  const matching = state.guesses
    .map((guess, index) => ({ guess, index }))
    .filter(({ guess }) => guess.exact + guess.misplaced > 0);
  for (let color = 1; color <= puzzle.symbolCount; color++) {
    const evidence = matching
      .map(({ guess, index }) => (guess.code.includes(color) ? index : -1))
      .filter((index) => index >= 0);
    if (evidence.length >= 2 && !positions.some((group) => group.has(color)))
      unplaced.set(color, { strength: "normal", evidence });
  }
  return { positions, unplaced };
}
export function logicalAnalysis(
  puzzle: MastermindPuzzle,
  state: MastermindState,
) {
  const candidates = consistentCandidates(puzzle, state),
    positionColors = Array.from({ length: puzzle.codeLength }, (_, index) =>
      [...new Set(candidates.map((code) => code[index]))].sort(),
    ),
    counts = Array.from({ length: puzzle.symbolCount }, (_, offset) => {
      const values = candidates.map(
        (code) => code.filter((color) => color === offset + 1).length,
      );
      return {
        color: offset + 1,
        min: values.length ? Math.min(...values) : 0,
        max: values.length ? Math.max(...values) : 0,
      };
    });
  return { candidates, positionColors, counts };
}
export function selectedLogicalAnalysis(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  selected: number[],
) {
  const selectedSet = new Set(selected),
    subset = {
      ...state,
      guesses: state.guesses.filter((_, index) => selectedSet.has(index)),
    };
  return logicalAnalysis(puzzle, subset);
}
export interface InformationMetrics {
  outcomeCount: number;
  worstRemaining: number;
  expectedRemaining: number;
}
export function informationMetrics(candidates: number[][], guess: number[]) {
  const buckets = new Map<string, number>();
  for (const candidate of candidates) {
    const key = scoreGuess(candidate, guess).join(":");
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const sizes = [...buckets.values()],
    total = candidates.length;
  return {
    outcomeCount: buckets.size,
    worstRemaining: sizes.length ? Math.max(...sizes) : 0,
    expectedRemaining: total
      ? sizes.reduce((sum, size) => sum + size * size, 0) / total
      : 0,
  } as InformationMetrics;
}
export function informationGuessExamples(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  selected: number[],
  limit = 3,
) {
  const candidates = selectedLogicalAnalysis(
      puzzle,
      state,
      selected,
    ).candidates,
    previous = new Set(state.guesses.map((guess) => guess.code.join(":")));
  return [...codes(puzzle)]
    .filter(
      (guess) =>
        !previous.has(guess.join(":")) &&
        Object.entries(state.revealed).every(
          ([index, value]) => guess[Number(index)] === value,
        ),
    )
    .map((guess) => ({ guess, metrics: informationMetrics(candidates, guess) }))
    .sort(
      (left, right) =>
        left.metrics.worstRemaining - right.metrics.worstRemaining ||
        left.metrics.expectedRemaining - right.metrics.expectedRemaining ||
        right.metrics.outcomeCount - left.metrics.outcomeCount ||
        left.guess.join("").localeCompare(right.guess.join("")),
    )
    .slice(0, limit);
}
export function evaluateInformationGuess(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  selected: number[],
  guess: number[],
) {
  const candidates = selectedLogicalAnalysis(
    puzzle,
    state,
    selected,
  ).candidates;
  if (!candidates.length)
    return {
      status: "inconsistent" as const,
      candidates,
      metrics: null,
      best: null,
    };
  if (candidates.length === 1)
    return { status: "solved" as const, candidates, metrics: null, best: null };
  const metrics = informationMetrics(candidates, guess),
    best =
      informationGuessExamples(puzzle, state, selected, 1)[0]?.metrics ??
      metrics,
    ratio = best.worstRemaining
      ? metrics.worstRemaining / best.worstRemaining
      : 1,
    rating =
      ratio <= 1.25
        ? "high"
        : ratio <= 2
          ? "standard"
          : ratio <= 3
            ? "low"
            : "very-low";
  return { status: "ready" as const, candidates, metrics, best, rating };
}
export function revealInformationExamples(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  selected: number[],
) {
  const normalized = [...selected].sort((a, b) => a - b),
    signature = `${state.guesses.length}:${Object.keys(state.revealed).length}:${normalized.join(",")}`,
    counted = !state.informationHintSignatures.includes(signature);
  return {
    examples: informationGuessExamples(puzzle, state, normalized),
    counted,
    state: {
      ...state,
      hintCount: state.hintCount + (counted ? 1 : 0),
      informationHintSignatures: counted
        ? [...state.informationHintSignatures, signature]
        : state.informationHintSignatures,
    },
  };
}
export function addGuessColorsToNotes(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  guessIndex: number,
) {
  const guess = state.guesses[guessIndex];
  if (!guess) return state;
  const colors = [...new Set(guess.code)].filter(
    (color) => color >= 1 && color <= puzzle.symbolCount,
  );
  return {
    ...state,
    positionNotes: state.positionNotes.map((notes) =>
      [...new Set([...notes, ...colors])].sort(),
    ),
  };
}
export function organizeNotesFromSelection(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  selected: number[],
) {
  const analysis = selectedLogicalAnalysis(puzzle, state, selected);
  let removed = 0;
  const positionNotes = state.positionNotes.map((notes, index) => {
    const allowed = new Set(analysis.positionColors[index]),
      next = notes.filter((color) => allowed.has(color));
    removed += notes.length - next.length;
    return next;
  });
  return {
    analysis,
    removed,
    state: removed ? { ...state, positionNotes } : state,
  };
}
export function replaceNotesFromSelection(
  puzzle: MastermindPuzzle,
  state: MastermindState,
  selected: number[],
) {
  const analysis = selectedLogicalAnalysis(puzzle, state, selected),
    signature = `${state.guesses.length}:${Object.keys(state.revealed).length}:${[...selected].sort().join(",")}:${analysis.candidates.map((code) => code.join("")).join("|")}`,
    counted = !state.memoHintSignatures.includes(signature);
  return {
    analysis,
    counted,
    state: {
      ...state,
      positionNotes: analysis.positionColors.map((colors) => [...colors]),
      hintCount: state.hintCount + (counted ? 1 : 0),
      memoHintSignatures: counted
        ? [...state.memoHintSignatures, signature]
        : state.memoHintSignatures,
    },
  };
}
export function cleanPositionNotes(
  puzzle: MastermindPuzzle,
  state: MastermindState,
) {
  const analysis = logicalAnalysis(puzzle, state);
  let removed = 0;
  const positionNotes = state.positionNotes.map((notes, index) => {
    const allowed = new Set(analysis.positionColors[index]),
      next = notes.filter((color) => allowed.has(color));
    removed += notes.length - next.length;
    return next;
  });
  return { state: removed ? { ...state, positionNotes } : state, removed };
}
export function restore(puzzle: MastermindPuzzle, state: MastermindState) {
  const migrated = {
    ...state,
    positionNotes:
      Array.isArray(state.positionNotes) &&
      state.positionNotes.length === puzzle.codeLength
        ? state.positionNotes
        : Array.from({ length: puzzle.codeLength }, () => []),
    colorNotes: state.colorNotes ?? {},
    pinnedGuesses: Array.isArray(state.pinnedGuesses)
      ? state.pinnedGuesses
          .filter((index) => index >= 0 && index < state.guesses.length)
          .slice(0, 2)
      : [],
    guessNotes: state.guessNotes ?? {},
    memoHintSignatures: Array.isArray(state.memoHintSignatures)
      ? state.memoHintSignatures
      : [],
    informationHintSignatures: Array.isArray(state.informationHintSignatures)
      ? state.informationHintSignatures
      : [],
  };
  if (
    migrated.current.length !== puzzle.codeLength ||
    migrated.selected < 0 ||
    migrated.selected >= puzzle.codeLength ||
    migrated.guesses.length > puzzle.maxAttempts ||
    migrated.hintCount < 0
  )
    throw new Error("保存状態が不正です。");
  for (const result of migrated.guesses) {
    const [exact, misplaced] = scoreGuess(puzzle.secret, result.code);
    if (
      result.code.length !== puzzle.codeLength ||
      exact !== result.exact ||
      misplaced !== result.misplaced
    )
      throw new Error("保存履歴が不正です。");
  }
  for (const [index, value] of Object.entries(migrated.revealed))
    if (
      puzzle.secret[Number(index)] !== value ||
      migrated.current[Number(index)] !== value
    )
      throw new Error("公開位置が不正です。");
  return migrated;
}
