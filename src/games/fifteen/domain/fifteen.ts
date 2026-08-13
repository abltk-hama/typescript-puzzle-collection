export const GOAL = [...Array.from({ length: 15 }, (_, index) => index + 1), 0];
export interface FifteenPuzzle {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard" | "generated";
  initialTiles: number[];
  knownSolution: number[];
  metadata: Record<string, unknown>;
}
export interface FifteenState {
  tiles: number[];
  history: number[];
  hintTile: number | null;
  hintCount: number;
  hintRoute: number[];
}
export interface FifteenRectangle {
  top: number;
  left: number;
  bottom: number;
  right: number;
}
export type RotationDirection = "clockwise" | "counterclockwise";
export interface EmptyNavigationPath {
  target: number;
  moves: number[];
}
export const sameTiles = (left: number[], right: number[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);
export function moveTile(tiles: number[], tile: number): number[] | null {
  if (tile === 0) return null;
  const source = tiles.indexOf(tile),
    empty = tiles.indexOf(0);
  if (
    source < 0 ||
    Math.abs(Math.floor(source / 4) - Math.floor(empty / 4)) +
      Math.abs((source % 4) - (empty % 4)) !==
      1
  )
    return null;
  const result = [...tiles];
  [result[source], result[empty]] = [result[empty], result[source]];
  return result;
}
export function initialGame(puzzle: FifteenPuzzle): FifteenState {
  return {
    tiles: [...puzzle.initialTiles],
    history: [],
    hintTile: null,
    hintCount: 0,
    hintRoute: [],
  };
}
export function move(state: FifteenState, tile: number): FifteenState {
  const tiles = moveTile(state.tiles, tile);
  if (!tiles) return state;
  const hintRoute = state.hintRoute[0] === tile ? state.hintRoute.slice(1) : [];
  return {
    ...state,
    tiles,
    history: [...state.history, tile],
    hintTile: null,
    hintRoute,
  };
}
export function movableTiles(tiles: number[]): number[] {
  const empty = tiles.indexOf(0),
    row = Math.floor(empty / 4),
    column = empty % 4;
  return [
    [row - 1, column],
    [row + 1, column],
    [row, column - 1],
    [row, column + 1],
  ]
    .filter(([r, c]) => r >= 0 && r < 4 && c >= 0 && c < 4)
    .map(([r, c]) => tiles[r * 4 + c]);
}
export function alignedMoveTiles(tiles: number[], tile: number): number[] {
  if (tile === 0) return [];
  const source = tiles.indexOf(tile),
    empty = tiles.indexOf(0);
  if (source < 0) return [];
  const sourceRow = Math.floor(source / 4),
    emptyRow = Math.floor(empty / 4),
    sourceColumn = source % 4,
    emptyColumn = empty % 4;
  if (sourceRow !== emptyRow && sourceColumn !== emptyColumn) return [];
  const step =
      sourceRow === emptyRow
        ? source < empty
          ? -1
          : 1
        : source < empty
          ? -4
          : 4,
    result: number[] = [];
  for (let index = empty + step; ; index += step) {
    result.push(tiles[index]);
    if (index === source) break;
  }
  return result;
}
export function moveLine(state: FifteenState, tile: number): FifteenState {
  return alignedMoveTiles(state.tiles, tile).reduce(
    (current, nextTile) => move(current, nextTile),
    state,
  );
}
export function applyMoves(state: FifteenState, moves: number[]) {
  return moves.reduce((current, tile) => move(current, tile), state);
}
export function rectangleFromCorners(
  first: number,
  second: number,
): FifteenRectangle | null {
  const firstRow = Math.floor(first / 4),
    firstColumn = first % 4,
    secondRow = Math.floor(second / 4),
    secondColumn = second % 4;
  if (firstRow === secondRow || firstColumn === secondColumn) return null;
  return {
    top: Math.min(firstRow, secondRow),
    left: Math.min(firstColumn, secondColumn),
    bottom: Math.max(firstRow, secondRow),
    right: Math.max(firstColumn, secondColumn),
  };
}
export function rectanglePerimeter(rectangle: FifteenRectangle) {
  const result: number[] = [];
  for (let column = rectangle.left; column <= rectangle.right; column++)
    result.push(rectangle.top * 4 + column);
  for (let row = rectangle.top + 1; row <= rectangle.bottom; row++)
    result.push(row * 4 + rectangle.right);
  for (let column = rectangle.right - 1; column >= rectangle.left; column--)
    result.push(rectangle.bottom * 4 + column);
  for (let row = rectangle.bottom - 1; row > rectangle.top; row--)
    result.push(row * 4 + rectangle.left);
  return result;
}
export function rotationMoves(
  tiles: number[],
  rectangle: FifteenRectangle,
  direction: RotationDirection,
  mode: "step" | "corner" | "lap",
) {
  const perimeter = rectanglePerimeter(rectangle),
    empty = tiles.indexOf(0),
    start = perimeter.indexOf(empty);
  if (start < 0) return [];
  const delta = direction === "clockwise" ? 1 : -1,
    corners = new Set([
      rectangle.top * 4 + rectangle.left,
      rectangle.top * 4 + rectangle.right,
      rectangle.bottom * 4 + rectangle.right,
      rectangle.bottom * 4 + rectangle.left,
    ]),
    limit = mode === "step" ? 1 : perimeter.length,
    result: number[] = [];
  let current = [...tiles];
  let index = start;
  for (let count = 0; count < limit; count++) {
    index = (index + delta + perimeter.length) % perimeter.length;
    const tile = current[perimeter[index]];
    result.push(tile);
    current = moveTile(current, tile)!;
    if (mode === "corner" && corners.has(perimeter[index])) break;
  }
  return result;
}
export function emptyNavigationPaths(tiles: number[], depth: number) {
  const maximum = Math.max(1, Math.min(3, depth)),
    queue: [number[], number[]][] = [[tiles, []]],
    results = new Map<number, number[][]>();
  for (let level = 0; level < maximum; level++) {
    const next: [number[], number[]][] = [];
    for (const [current, path] of queue)
      for (const tile of movableTiles(current)) {
        if (path.at(-1) === tile) continue;
        const moved = moveTile(current, tile)!;
        const moves = [...path, tile],
          target = moved.indexOf(0),
          paths = results.get(target) ?? [];
        if (paths.length < 3) {
          paths.push(moves);
          results.set(target, paths);
        }
        next.push([moved, moves]);
      }
    queue.splice(0, queue.length, ...next);
  }
  return [...results].flatMap(([target, paths]) =>
    paths.map((moves) => ({ target, moves }) as EmptyNavigationPath),
  );
}
export const correctTileCount = (tiles: number[]) =>
  tiles.filter((tile, index) => tile !== 0 && tile === index + 1).length;
export const isCorrectPosition = (tiles: number[], index: number) =>
  tiles[index] !== 0 && tiles[index] === index + 1;
export const goalIndex = (tile: number) => (tile > 0 ? tile - 1 : -1);
export function moveEmpty(
  state: FifteenState,
  rowDelta: number,
  columnDelta: number,
): FifteenState {
  const empty = state.tiles.indexOf(0),
    row = Math.floor(empty / 4),
    column = empty % 4,
    targetRow = row + rowDelta,
    targetColumn = column + columnDelta;
  if (targetRow < 0 || targetRow >= 4 || targetColumn < 0 || targetColumn >= 4)
    return state;
  return move(state, state.tiles[targetRow * 4 + targetColumn]);
}
export function undo(state: FifteenState): FifteenState {
  if (!state.history.length) return state;
  const tile = state.history.at(-1)!,
    tiles = moveTile(state.tiles, tile)!;
  return {
    ...state,
    tiles,
    history: state.history.slice(0, -1),
    hintTile: null,
    hintRoute: [],
  };
}
export const isComplete = (state: FifteenState) => sameTiles(state.tiles, GOAL);
export function nextHint(
  puzzle: FifteenPuzzle,
  state: FifteenState,
): FifteenState {
  if (isComplete(state) || state.hintTile !== null) return state;
  const route = state.hintRoute.length
    ? state.hintRoute
    : [...state.history].reverse().concat(puzzle.knownSolution);
  if (!route.length) return state;
  return {
    ...state,
    hintTile: route[0],
    hintCount: state.hintCount + 1,
    hintRoute: route,
  };
}
export function restore(puzzle: FifteenPuzzle, state: FifteenState) {
  let replay = [...puzzle.initialTiles];
  for (const tile of state.history) {
    const moved = moveTile(replay, tile);
    if (!moved) throw new Error("保存履歴に不正な移動があります。");
    replay = moved;
  }
  if (!sameTiles(replay, state.tiles))
    throw new Error("保存状態と操作履歴が一致しません。");
  if (state.hintCount < 0 || !Number.isInteger(state.hintCount))
    throw new Error("ヒント状態が不正です。");
  return state;
}
