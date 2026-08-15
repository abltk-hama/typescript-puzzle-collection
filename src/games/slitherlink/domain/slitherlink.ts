export type EdgeStatus = "unknown" | "line" | "cross";
export type EdgeSource = "manual" | "hint" | null;
export interface SlitherlinkPuzzle {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  width: number;
  height: number;
  clues: (number | null)[];
  solutionEdges: string[];
  generated?: boolean;
  seed?: number;
}
export interface SlitherlinkState {
  edges: Record<string, EdgeStatus>;
  sources: Record<string, EdgeSource>;
  selectedCell: number | null;
  hintCount: number;
}
export interface ClueStatus {
  clue: number;
  lines: number;
  unknown: number;
  complete: boolean;
  contradiction: boolean;
}
export const horizontalEdge = (row: number, column: number) =>
  `h:${row}:${column}`;
export const verticalEdge = (row: number, column: number) =>
  `v:${row}:${column}`;
export const allEdges = (p: SlitherlinkPuzzle) => [
  ...Array.from({ length: p.height + 1 }, (_, r) =>
    Array.from({ length: p.width }, (_, c) => horizontalEdge(r, c)),
  ).flat(),
  ...Array.from({ length: p.height }, (_, r) =>
    Array.from({ length: p.width + 1 }, (_, c) => verticalEdge(r, c)),
  ).flat(),
];
export function initialSlitherlink(p: SlitherlinkPuzzle): SlitherlinkState {
  return {
    edges: Object.fromEntries(allEdges(p).map((e) => [e, "unknown"])),
    sources: Object.fromEntries(allEdges(p).map((e) => [e, null])),
    selectedCell: null,
    hintCount: 0,
  };
}
export function cellEdges(p: SlitherlinkPuzzle, index: number) {
  const r = Math.floor(index / p.width),
    c = index % p.width;
  return [
    horizontalEdge(r, c),
    verticalEdge(r, c + 1),
    horizontalEdge(r + 1, c),
    verticalEdge(r, c),
  ];
}
export function edgeVertices(edge: string) {
  const [k, rs, cs] = edge.split(":"),
    r = Number(rs),
    c = Number(cs);
  return k === "h"
    ? [`${r}:${c}`, `${r}:${c + 1}`]
    : [`${r}:${c}`, `${r + 1}:${c}`];
}
export function edgeBetween(a: string, b: string) {
  const [ar, ac] = a.split(":").map(Number),
    [br, bc] = b.split(":").map(Number);
  if (ar === br && Math.abs(ac - bc) === 1)
    return horizontalEdge(ar, Math.min(ac, bc));
  if (ac === bc && Math.abs(ar - br) === 1)
    return verticalEdge(Math.min(ar, br), ac);
  return null;
}
export function clueStatus(
  p: SlitherlinkPuzzle,
  s: SlitherlinkState,
  index: number,
): ClueStatus | null {
  const clue = p.clues[index];
  if (clue === null) return null;
  const statuses = cellEdges(p, index).map((e) => s.edges[e]),
    lines = statuses.filter((x) => x === "line").length,
    unknown = statuses.filter((x) => x === "unknown").length;
  return {
    clue,
    lines,
    unknown,
    complete: lines === clue && unknown === 0,
    contradiction: lines > clue || lines + unknown < clue,
  };
}
export function vertexDegree(s: SlitherlinkState, v: string) {
  return Object.entries(s.edges).filter(
    ([e, x]) => x === "line" && edgeVertices(e).includes(v),
  ).length;
}
export function contradictions(p: SlitherlinkPuzzle, s: SlitherlinkState) {
  return (
    p.clues.some((_, i) => clueStatus(p, s, i)?.contradiction) ||
    Array.from(new Set(allEdges(p).flatMap(edgeVertices))).some(
      (v) => vertexDegree(s, v) > 2,
    )
  );
}
export function isComplete(p: SlitherlinkPuzzle, s: SlitherlinkState) {
  if (
    contradictions(p, s) ||
    p.clues.some(
      (clue, i) =>
        clue !== null &&
        cellEdges(p, i).filter((e) => s.edges[e] === "line").length !== clue,
    )
  )
    return false;
  const lines = allEdges(p).filter((e) => s.edges[e] === "line");
  if (!lines.length) return false;
  const degrees = new Map<string, number>();
  for (const e of lines)
    for (const v of edgeVertices(e)) degrees.set(v, (degrees.get(v) ?? 0) + 1);
  if ([...degrees.values()].some((d) => d !== 2)) return false;
  const remaining = new Set(lines),
    stack = [lines[0]];
  remaining.delete(lines[0]);
  while (stack.length) {
    const vertices = edgeVertices(stack.pop()!);
    for (const candidate of [...remaining])
      if (edgeVertices(candidate).some((v) => vertices.includes(v))) {
        remaining.delete(candidate);
        stack.push(candidate);
      }
  }
  return remaining.size === 0;
}
export function cycleEdge(s: SlitherlinkState, edge: string) {
  const current = s.edges[edge],
    next: EdgeStatus =
      current === "unknown" ? "line" : current === "line" ? "cross" : "unknown";
  return {
    ...s,
    edges: { ...s.edges, [edge]: next },
    sources: {
      ...s.sources,
      [edge]: next === "unknown" ? null : ("manual" as const),
    },
  };
}
export function surroundingCandidates(
  p: SlitherlinkPuzzle,
  s: SlitherlinkState,
  index: number,
  logical: boolean,
) {
  const clue = p.clues[index];
  if (clue === null) return [];
  const edges = cellEdges(p, index),
    result: Record<string, EdgeStatus>[] = [];
  for (let mask = 0; mask < 16; mask++) {
    const statuses = Object.fromEntries(
      edges.map((e, o) => [e, mask & (1 << o) ? "line" : "cross"]),
    ) as Record<string, EdgeStatus>;
    if (Object.values(statuses).filter((x) => x === "line").length !== clue)
      continue;
    if (
      edges.some((e) => s.edges[e] !== "unknown" && s.edges[e] !== statuses[e])
    )
      continue;
    if (
      logical &&
      contradictions(p, { ...s, edges: { ...s.edges, ...statuses } })
    )
      continue;
    result.push(statuses);
  }
  return result;
}
export function applyCandidate(
  s: SlitherlinkState,
  candidate: Record<string, EdgeStatus>,
) {
  const edges = { ...s.edges },
    sources = { ...s.sources };
  for (const [e, status] of Object.entries(candidate))
    if (edges[e] === "unknown") {
      edges[e] = status;
      sources[e] = "manual";
    }
  return { ...s, edges, sources };
}
export function revealUnusedEdge(
  p: SlitherlinkPuzzle,
  s: SlitherlinkState,
  preferred?: string | null,
) {
  const solution = new Set(p.solutionEdges);
  if (preferred && solution.has(preferred)) return s;
  const candidate =
    preferred ??
    allEdges(p).find((e) => s.edges[e] !== "cross" && !solution.has(e));
  if (!candidate || s.edges[candidate] === "cross") return s;
  return {
    ...s,
    edges: { ...s.edges, [candidate]: "cross" as const },
    sources: { ...s.sources, [candidate]: "hint" as const },
    hintCount: s.hintCount + 1,
  };
}
function neighbors(p: SlitherlinkPuzzle, v: string) {
  const [r, c] = v.split(":").map(Number);
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ]
    .filter(([nr, nc]) => nr >= 0 && nr <= p.height && nc >= 0 && nc <= p.width)
    .map(([nr, nc]) => `${nr}:${nc}`);
}
function shortestSegments(
  p: SlitherlinkPuzzle,
  s: SlitherlinkState,
  start: string,
  goal: string,
  limit = 8,
) {
  const queue = [goal],
    distance = new Map([[goal, 0]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const next of neighbors(p, current)) {
      const edge = edgeBetween(current, next)!;
      if (s.edges[edge] === "cross" || distance.has(next)) continue;
      distance.set(next, distance.get(current)! + 1);
      queue.push(next);
    }
  }
  if (!distance.has(start)) return [];
  const paths: string[][] = [];
  function walk(v: string, edges: string[]) {
    if (paths.length >= limit) return;
    if (v === goal) {
      paths.push(edges);
      return;
    }
    const d = distance.get(v)!;
    for (const next of neighbors(p, v))
      if (distance.get(next) === d - 1)
        walk(next, [...edges, edgeBetween(v, next)!]);
  }
  walk(start, []);
  return paths;
}
export function routeCandidates(
  p: SlitherlinkPuzzle,
  s: SlitherlinkState,
  vertices: string[],
  logical: boolean,
  limit = 8,
) {
  if (vertices.length < 2) return [];
  let routes: string[][] = [[]];
  for (let i = 0; i < vertices.length - 1; i++) {
    const segments = shortestSegments(
      p,
      s,
      vertices[i],
      vertices[i + 1],
      limit,
    );
    routes = routes
      .flatMap((route) => segments.map((segment) => [...route, ...segment]))
      .slice(0, limit);
  }
  return routes.filter(
    (route) =>
      !logical ||
      !contradictions(p, {
        ...s,
        edges: {
          ...s.edges,
          ...Object.fromEntries(route.map((e) => [e, "line" as const])),
        },
      }),
  );
}
export function applyRoute(s: SlitherlinkState, route: string[]) {
  const edges = { ...s.edges },
    sources = { ...s.sources };
  for (const e of route)
    if (edges[e] === "unknown") {
      edges[e] = "line";
      sources[e] = "manual";
    }
  return { ...s, edges, sources };
}
