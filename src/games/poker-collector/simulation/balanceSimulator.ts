import {
  RANKS,
  SUITS,
  createCard,
  type Card,
} from "../../../common/cards";
import { PokerHandDetector } from "../domain/pokerHands";
import { calculateBonusScore } from "../domain/scorer";
import type { PokerHand } from "../domain/pokerHandTypes";
import {
  ROLE_VARIANTS,
  type RoleVariant,
  type RoleVariantId,
} from "./roleVariants";

const detector = new PokerHandDetector();

export interface OptimalRolePlan {
  roles: PokerHand[];
  baseScore: number;
  bonusScore: number;
  totalScore: number;
}

export interface BalanceSimulationOptions {
  sampleCount?: number;
  boardSize?: number;
  seed?: number;
  targetScores?: readonly number[];
  variants?: readonly RoleVariant[];
}

export interface DistributionSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
  standardDeviation: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface VariantSimulationSummary {
  variantId: RoleVariantId;
  label: string;
  scores: number[];
  distribution: DistributionSummary;
  targetReachRate: Record<number, number>;
  baselineMeanDelta: number;
  baselineMeanDeltaRate: number;
  pairedDelta: DistributionSummary;
}

export interface BalanceSimulationResult {
  sampleCount: number;
  boardSize: number;
  seed: number;
  targetScores: number[];
  variants: VariantSimulationSummary[];
  elapsedMs: number;
}

/**
 * 25枚すべてが既知で、役の確定順や猶予・保留・破棄を無視した場合の
 * 「カード重複なし最大得点」を求める。バランス調整用の理論上限であり、
 * 実プレイ期待値ではない。
 */
export function findOptimalRolePlan(
  cards: Card[],
  variant: RoleVariant
): OptimalRolePlan {
  // easy は現状すべての役を検出できるため、ここでは役候補の母集合として利用し、
  // variant 側で有効役だけに絞る。難易度固有の猶予等は理論上限には含めない。
  const roles = detector.detectAllRoles(
    cards,
    "easy",
    new Set(),
    variant.enabledRoles
  );

  return solveNonOverlappingPlan(cards, roles);
}

export function runBalanceSimulation(
  options: BalanceSimulationOptions = {}
): BalanceSimulationResult {
  const sampleCount = normalizePositiveInteger(options.sampleCount ?? 1000, "sampleCount");
  const boardSize = normalizePositiveInteger(options.boardSize ?? 25, "boardSize");
  if (boardSize > 30) {
    throw new Error("boardSize must be 30 or less because the exact solver uses a 32-bit card mask.");
  }
  if (boardSize > 52) throw new Error("boardSize cannot exceed a standard 52-card deck.");

  const seed = (options.seed ?? 0x504f4b45) >>> 0;
  const targetScores = [...(options.targetScores ?? [300, 800, 1500])];
  const variants = options.variants?.length ? [...options.variants] : [...ROLE_VARIANTS];
  const baseline = variants.find((variant) => variant.id === "standard");
  if (!baseline) throw new Error("Simulation variants must include the standard baseline.");

  const scoresByVariant = new Map<RoleVariantId, number[]>(
    variants.map((variant) => [variant.id, []])
  );
  const random = createSeededRandom(seed);
  const startedAt = performance.now();

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const board = drawBoard(boardSize, random);
    for (const variant of variants) {
      const plan = findOptimalRolePlan(board, variant);
      scoresByVariant.get(variant.id)!.push(plan.totalScore);
    }
  }

  const baselineScores = scoresByVariant.get("standard")!;
  const baselineMean = mean(baselineScores);
  const summaries = variants.map((variant) => {
    const scores = scoresByVariant.get(variant.id)!;
    const deltas = scores.map((score, index) => score - baselineScores[index]);
    const scoreMean = mean(scores);
    return {
      variantId: variant.id,
      label: variant.label,
      scores,
      distribution: summarizeDistribution(scores),
      targetReachRate: Object.fromEntries(
        targetScores.map((target) => [
          target,
          scores.filter((score) => score >= target).length / scores.length,
        ])
      ),
      baselineMeanDelta: scoreMean - baselineMean,
      baselineMeanDeltaRate:
        baselineMean === 0 ? 0 : (scoreMean - baselineMean) / baselineMean,
      pairedDelta: summarizeDistribution(deltas),
    } satisfies VariantSimulationSummary;
  });

  return {
    sampleCount,
    boardSize,
    seed,
    targetScores,
    variants: summaries,
    elapsedMs: performance.now() - startedAt,
  };
}

export function formatBalanceSimulationReport(result: BalanceSimulationResult): string {
  const targets = result.targetScores.map((target) => `${target}点到達率`).join(" | ");
  const lines = [
    `Poker Collector 理論上限シミュレーション`,
    `samples=${result.sampleCount}, boardSize=${result.boardSize}, seed=${result.seed}, elapsed=${result.elapsedMs.toFixed(0)}ms`,
    "",
    `条件 | 平均 | P10 | P25 | P50 | P75 | P90 | 標準比 | ${targets}`,
    `---|---:|---:|---:|---:|---:|---:|---:|${result.targetScores.map(() => "---:").join("|")}`,
  ];

  for (const variant of result.variants) {
    const d = variant.distribution;
    const reachRates = result.targetScores
      .map((target) => formatPercent(variant.targetReachRate[target]))
      .join(" | ");
    lines.push(
      `${variant.label} | ${d.mean.toFixed(1)} | ${d.p10} | ${d.p25} | ${d.p50} | ${d.p75} | ${d.p90} | ` +
        `${signed(variant.baselineMeanDelta.toFixed(1))} (${signedPercent(variant.baselineMeanDeltaRate)}) | ${reachRates}`
    );
  }

  return lines.join("\n");
}

function solveNonOverlappingPlan(cards: Card[], roles: PokerHand[]): OptimalRolePlan {
  if (roles.length === 0) {
    return { roles: [], baseScore: 0, bonusScore: 0, totalScore: 0 };
  }

  const identityToIndex = new Map(cards.map((card, index) => [cardIdentity(card), index]));
  const rawCandidates = roles.map((role) => ({
    role,
    mask: role.cards.reduce((mask, card) => {
      const index = identityToIndex.get(cardIdentity(card));
      return index === undefined ? mask : mask | (1 << index);
    }, 0),
  }));

  // 同一カード集合なら得点の高い役だけを残す。
  const candidates = Array.from(
    rawCandidates.reduce((best, candidate) => {
      const current = best.get(candidate.mask);
      if (!current || candidate.role.baseScore > current.role.baseScore) {
        best.set(candidate.mask, candidate);
      }
      return best;
    }, new Map<number, (typeof rawCandidates)[number]>()).values()
  );

  const rolesByCard = Array.from({ length: cards.length }, () => [] as typeof candidates);
  for (const candidate of candidates) {
    for (let index = 0; index < cards.length; index += 1) {
      if ((candidate.mask & (1 << index)) !== 0) rolesByCard[index].push(candidate);
    }
  }

  type Solution = { baseScore: number; roles: PokerHand[] };
  const memo = new Map<number, Map<number, Solution>>();

  function solve(availableMask: number): Map<number, Solution> {
    const cached = memo.get(availableMask);
    if (cached) return cached;
    if (availableMask === 0) {
      const empty = new Map<number, Solution>([[0, { baseScore: 0, roles: [] }]]);
      memo.set(availableMask, empty);
      return empty;
    }

    const pivot = choosePivotCard(availableMask, rolesByCard);
    const pivotBit = 1 << pivot;
    const result = cloneSolutions(solve(availableMask & ~pivotBit));

    for (const candidate of rolesByCard[pivot]) {
      if ((candidate.mask & availableMask) !== candidate.mask) continue;
      const rest = solve(availableMask & ~candidate.mask);
      for (const [count, solution] of rest) {
        const nextCount = count + 1;
        const nextScore = solution.baseScore + candidate.role.baseScore;
        const existing = result.get(nextCount);
        if (!existing || nextScore > existing.baseScore) {
          result.set(nextCount, {
            baseScore: nextScore,
            roles: [candidate.role, ...solution.roles],
          });
        }
      }
    }

    memo.set(availableMask, result);
    return result;
  }

  const fullMask = (1 << cards.length) - 1;
  const solutions = solve(fullMask);
  let bestCount = 0;
  let best: Solution = { baseScore: 0, roles: [] };
  let bestTotal = 0;

  for (const [count, solution] of solutions) {
    const total = solution.baseScore + calculateBonusScore(count);
    if (
      total > bestTotal ||
      (total === bestTotal && solution.baseScore > best.baseScore) ||
      (total === bestTotal && solution.baseScore === best.baseScore && count > bestCount)
    ) {
      bestCount = count;
      best = solution;
      bestTotal = total;
    }
  }

  return {
    roles: best.roles,
    baseScore: best.baseScore,
    bonusScore: calculateBonusScore(bestCount),
    totalScore: bestTotal,
  };
}

function drawBoard(size: number, random: () => number): Card[] {
  const deck = SUITS.flatMap((suit) =>
    RANKS.map((rank) => createCard(suit, rank, `${rank}${suit}`))
  );
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck.slice(0, size);
}

function createSeededRandom(seed: number): () => number {
  let state = seed || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function choosePivotCard<T extends { mask: number }>(availableMask: number, rolesByCard: T[][]): number {
  let bestIndex = 0;
  let bestCount = Number.POSITIVE_INFINITY;
  for (let index = 0; index < rolesByCard.length; index += 1) {
    if ((availableMask & (1 << index)) === 0) continue;
    let count = 0;
    for (const role of rolesByCard[index]) {
      if ((role.mask & availableMask) === role.mask) count += 1;
    }
    if (count < bestCount) {
      bestCount = count;
      bestIndex = index;
      if (count === 0) break;
    }
  }
  return bestIndex;
}

function cloneSolutions(source: Map<number, { baseScore: number; roles: PokerHand[] }>) {
  return new Map(
    Array.from(source.entries(), ([count, solution]) => [
      count,
      { baseScore: solution.baseScore, roles: [...solution.roles] },
    ])
  );
}

function summarizeDistribution(values: number[]): DistributionSummary {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      standardDeviation: 0,
      p10: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p90: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: average,
    median: percentile(sorted, 0.5),
    standardDeviation: Math.sqrt(variance),
    p10: percentile(sorted, 0.1),
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
    p90: percentile(sorted, 0.9),
  };
}

function percentile(sortedValues: number[], quantile: number): number {
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * quantile) - 1)
  );
  return sortedValues[index];
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function cardIdentity(card: Card): string {
  return card.id ? `${card.rank}${card.suit}#${card.id}` : `${card.rank}${card.suit}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function signed(value: string): string {
  return Number(value) > 0 ? `+${value}` : value;
}

function signedPercent(value: number): string {
  const formatted = `${(value * 100).toFixed(1)}%`;
  return value > 0 ? `+${formatted}` : formatted;
}
