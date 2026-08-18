import type { Card } from "../../../common/cards";
import { PokerHandDetector } from "./pokerHands";
import { calculateBonusScore } from "./scorer";
import type { PokerDifficulty, PokerHand } from "./pokerHandTypes";

const detector = new PokerHandDetector();

export interface HintPlan {
  roles: PokerHand[];
  baseScore: number;
  bonusScore: number;
  totalScore: number;
}

export function detectPlanningRoles(
  cards: Card[],
  difficulty: PokerDifficulty,
  discardedRoleKeys: ReadonlySet<string> = new Set()
): PokerHand[] {
  return detector.detectAllRoles(cards, difficulty, discardedRoleKeys);
}

export function findBestVisibleRolePlan(
  cards: Card[],
  difficulty: PokerDifficulty,
  discardedRoleKeys: ReadonlySet<string> = new Set()
): HintPlan {
  const roles = detector.detectAllRoles(cards, difficulty, discardedRoleKeys);
  if (roles.length === 0) {
    return { roles: [], baseScore: 0, bonusScore: 0, totalScore: 0 };
  }

  const identities = new Map<string, number>();
  cards.forEach((card, index) => identities.set(cardIdentity(card), index));

  const candidates = roles.map((role) => ({
    role,
    mask: role.cards.reduce((mask, card) => {
      const index = identities.get(cardIdentity(card));
      return index === undefined ? mask : mask | (1 << index);
    }, 0),
  }));

  // 同じカード集合・同点の候補は探索上1つで十分。
  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [`${candidate.mask}:${candidate.role.baseScore}`, candidate])).values()
  );

  const rolesByCard = Array.from({ length: cards.length }, () => [] as typeof uniqueCandidates);
  for (const candidate of uniqueCandidates) {
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

    // pivotをどの役にも使わない場合。
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

  const fullMask = cards.length >= 31 ? 0x7fffffff : (1 << cards.length) - 1;
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
    roles: [...best.roles].sort(
      (a, b) => b.baseScore - a.baseScore || a.rank - b.rank || a.key.localeCompare(b.key)
    ),
    baseScore: best.baseScore,
    bonusScore: calculateBonusScore(bestCount),
    totalScore: bestTotal,
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

function cardIdentity(card: Card): string {
  return card.id ? `${card.rank}${card.suit}#${card.id}` : `${card.rank}${card.suit}`;
}
