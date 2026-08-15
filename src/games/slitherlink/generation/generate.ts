import {
  cellEdges,
  initialSlitherlink,
  isComplete,
  type SlitherlinkPuzzle,
} from "../domain/slitherlink";
import { countSolutions } from "../domain/solver";
function random(seed: number) {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], rng: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function boundary(size: number, cells: Set<string>) {
  const edges = new Set<string>();
  for (const key of cells) {
    const [row, column] = key.split(":").map(Number),
      sides = [
        [row - 1, column, `h:${row}:${column}`],
        [row, column + 1, `v:${row}:${column + 1}`],
        [row + 1, column, `h:${row + 1}:${column}`],
        [row, column - 1, `v:${row}:${column}`],
      ] as const;
    for (const [nextRow, nextColumn, edge] of sides)
      if (
        nextRow < 0 ||
        nextRow >= size ||
        nextColumn < 0 ||
        nextColumn >= size ||
        !cells.has(`${nextRow}:${nextColumn}`)
      )
        edges.add(edge);
  }
  return [...edges];
}
export function generateSlitherlink(
  seed: number,
  size: 5 | 7 | 10,
  onProgress: (progress: number) => void = () => {},
): SlitherlinkPuzzle {
  const rng = random(seed),
    difficulty = size === 5 ? "easy" : size === 7 ? "medium" : "hard";
  for (let attempt = 0; attempt < 80; attempt++) {
    onProgress(Math.min(25, attempt));
    const occupied = new Set<string>([
        `${Math.floor(size / 2)}:${Math.floor(size / 2)}`,
      ]),
      target = Math.floor(size * size * (0.38 + rng() * 0.22));
    while (occupied.size < target) {
      const source = shuffle([...occupied], rng)[0],
        [row, column] = source.split(":").map(Number),
        neighbors = shuffle(
          [
            [row - 1, column],
            [row + 1, column],
            [row, column - 1],
            [row, column + 1],
          ],
          rng,
        ).filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
      if (neighbors.length) {
        const [r, c] = neighbors[0];
        occupied.add(`${r}:${c}`);
      }
    }
    const solutionEdges = boundary(size, occupied),
      shape = { width: size, height: size } as SlitherlinkPuzzle,
      fullClues = Array.from(
        { length: size * size },
        (_, index) =>
          cellEdges(shape, index).filter((edge) => solutionEdges.includes(edge))
            .length,
      ),
      base: SlitherlinkPuzzle = {
        id: `slither-generated-${seed}-${size}`,
        title: `生成問題 ${size}×${size}`,
        difficulty,
        width: size,
        height: size,
        clues: fullClues,
        solutionEdges,
        generated: true,
        seed,
      },
      initial = initialSlitherlink(base),
      solved = {
        ...initial,
        edges: {
          ...initial.edges,
          ...Object.fromEntries(
            solutionEdges.map((edge) => [edge, "line" as const]),
          ),
        },
      };
    if (!isComplete(base, solved)) continue;
    const initialCount = countSolutions(base, 2, size === 10 ? 250000 : 120000);
    if (initialCount.aborted || initialCount.count !== 1) continue;
    const clues: (number | null)[] = [...fullClues],
      order = shuffle([...clues.keys()], rng),
      removeTarget = Math.floor(
        clues.length * (size === 5 ? 0.42 : size === 7 ? 0.5 : 0.48),
      ),
      removalDeadline = Date.now() + (size === 10 ? 15000 : 8000);
    let removed = 0;
    for (
      let cursor = 0;
      cursor < order.length &&
      removed < removeTarget &&
      Date.now() < removalDeadline;
      cursor++
    ) {
      const index = order[cursor],
        previous = clues[index];
      clues[index] = null;
      const result = countSolutions(
        { ...base, clues },
        2,
        size === 10 ? 50000 : 80000,
      );
      if (!result.aborted && result.count === 1) removed++;
      else clues[index] = previous;
      onProgress(25 + Math.floor(((cursor + 1) / order.length) * 70));
    }
    onProgress(100);
    return {
      ...base,
      clues,
      title: `生成問題 ${size}×${size}（seed ${seed}）`,
    };
  }
  throw new Error(
    "一意解の問題を生成できませんでした。もう一度お試しください。",
  );
}
