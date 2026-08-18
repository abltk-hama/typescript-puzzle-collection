import {
  RANKS,
  countByRank,
  countBySuit,
  rankValue,
  type Card,
  type Rank,
} from "../../../common/cards";
import { ROLE_DEFINITIONS, isRoleEnabled } from "./roleDefinitions";
import type {
  PokerDifficulty,
  PokerHand,
  PokerRoleType,
} from "./pokerHandTypes";

const rankByValue = new Map<number, Rank>(
  RANKS.map((rank) => [rankValue[rank], rank])
);
rankByValue.set(1, "A");

export class PokerHandDetector {
  detectAllRoles(
    hand: Card[],
    difficulty: PokerDifficulty,
    discardedRoleKeys: ReadonlySet<string> = new Set(),
    enabledRoleTypes?: ReadonlySet<PokerRoleType>
  ): PokerHand[] {
    const roles: PokerHand[] = [];
    const enabled = (type: PokerRoleType) =>
      enabledRoleTypes ? enabledRoleTypes.has(type) : isRoleEnabled(type, difficulty);

    if (enabled("onePair")) {
      roles.push(...this.detectOnePairs(hand));
    }
    if (enabled("twoPair")) {
      roles.push(...this.detectTwoPairs(hand));
    }
    if (enabled("threeOfAKind")) {
      roles.push(...this.detectThreeOfAKinds(hand));
    }
    if (enabled("fourCardStraight")) {
      roles.push(...this.detectSequences(hand, 4, "fourCardStraight", this.standardPatterns(4)));
    }
    if (enabled("fourCardFlush")) {
      roles.push(...this.detectFlushes(hand, 4, "fourCardFlush"));
    }
    if (enabled("skipStraight")) {
      roles.push(...this.detectSequences(hand, 5, "skipStraight", this.skipPatterns()));
    }
    if (enabled("straight")) {
      roles.push(...this.detectSequences(hand, 5, "straight", this.standardPatterns(5)));
    }
    if (enabled("flush")) {
      roles.push(...this.detectFlushes(hand, 5, "flush"));
    }
    if (enabled("fullHouse")) {
      roles.push(...this.detectFullHouses(hand));
    }
    if (enabled("fourOfAKind")) {
      roles.push(...this.detectFourOfAKinds(hand));
    }
    if (enabled("straightFlush")) {
      roles.push(...this.detectStraightFlushes(hand));
    }
    if (enabled("royalFlush")) {
      roles.push(...this.detectRoyalFlushes(hand));
    }

    const available = roles.filter((role) => !discardedRoleKeys.has(role.discardKey));
    return this.removeDominatedDuplicates(this.uniqueRoles(available)).sort(
      (a, b) => b.baseScore - a.baseScore || a.rank - b.rank || a.key.localeCompare(b.key)
    );
  }

  private detectOnePairs(cards: Card[]): PokerHand[] {
    const roles: PokerHand[] = [];
    for (const [rank, rankCards] of countByRank(cards)) {
      for (const combo of combinations(rankCards, 2)) {
        roles.push(this.makeRole("onePair", combo, rank));
      }
    }
    return roles;
  }

  private detectTwoPairs(cards: Card[]): PokerHand[] {
    const pairRanks = Array.from(countByRank(cards).entries()).filter(([, rankCards]) => rankCards.length >= 2);
    const roles: PokerHand[] = [];

    for (const rankPair of combinations(pairRanks, 2)) {
      const [[, firstCards], [, secondCards]] = rankPair;
      for (const first of combinations(firstCards, 2)) {
        for (const second of combinations(secondCards, 2)) {
          roles.push(this.makeRole("twoPair", [...first, ...second]));
        }
      }
    }
    return roles;
  }

  private detectThreeOfAKinds(cards: Card[]): PokerHand[] {
    const roles: PokerHand[] = [];
    for (const [, rankCards] of countByRank(cards)) {
      for (const combo of combinations(rankCards, 3)) {
        roles.push(this.makeRole("threeOfAKind", combo));
      }
    }
    return roles;
  }

  private detectFourOfAKinds(cards: Card[]): PokerHand[] {
    const roles: PokerHand[] = [];
    for (const [, rankCards] of countByRank(cards)) {
      for (const combo of combinations(rankCards, 4)) {
        roles.push(this.makeRole("fourOfAKind", combo));
      }
    }
    return roles;
  }

  private detectFullHouses(cards: Card[]): PokerHand[] {
    const entries = Array.from(countByRank(cards).entries());
    const roles: PokerHand[] = [];

    for (const [threeRank, threeCards] of entries) {
      if (threeCards.length < 3) continue;
      for (const [pairRank, pairCards] of entries) {
        if (threeRank === pairRank || pairCards.length < 2) continue;
        for (const three of combinations(threeCards, 3)) {
          for (const pair of combinations(pairCards, 2)) {
            roles.push(this.makeRole("fullHouse", [...three, ...pair]));
          }
        }
      }
    }
    return roles;
  }

  private detectFlushes(cards: Card[], size: number, type: "flush" | "fourCardFlush"): PokerHand[] {
    const roles: PokerHand[] = [];
    for (const [, suitCards] of countBySuit(cards)) {
      for (const combo of combinations(suitCards, size)) {
        roles.push(this.makeRole(type, combo));
      }
    }
    return roles;
  }

  private detectStraightFlushes(cards: Card[]): PokerHand[] {
    const roles: PokerHand[] = [];
    for (const [, suitCards] of countBySuit(cards)) {
      roles.push(...this.detectSequences(suitCards, 5, "straightFlush", this.standardPatterns(5)));
    }
    return roles;
  }

  private detectRoyalFlushes(cards: Card[]): PokerHand[] {
    const royalPattern = [10, 11, 12, 13, 14];
    const roles: PokerHand[] = [];
    for (const [, suitCards] of countBySuit(cards)) {
      roles.push(...this.detectSequences(suitCards, 5, "royalFlush", [royalPattern]));
    }
    return roles;
  }

  private detectSequences(
    cards: Card[],
    size: number,
    type: "straight" | "fourCardStraight" | "skipStraight" | "straightFlush" | "royalFlush",
    patterns: number[][]
  ): PokerHand[] {
    if (cards.length < size) return [];

    const byRank = countByRank(cards);
    const roles: PokerHand[] = [];

    for (const pattern of patterns) {
      const cardChoices: Card[][] = [];
      let complete = true;

      for (const value of pattern) {
        const rank = rankByValue.get(value);
        const matches = rank ? byRank.get(rank) : undefined;
        if (!matches?.length) {
          complete = false;
          break;
        }
        cardChoices.push(matches);
      }

      if (!complete) continue;
      for (const combo of cartesian(cardChoices)) {
        roles.push(this.makeRole(type, combo));
      }
    }

    return roles;
  }

  private standardPatterns(size: 4 | 5): number[][] {
    const patterns: number[][] = [];
    for (let start = 2; start <= 15 - size; start += 1) {
      patterns.push(Array.from({ length: size }, (_, offset) => start + offset));
    }
    patterns.push(size === 5 ? [14, 2, 3, 4, 5] : [14, 2, 3, 4]);
    return patterns;
  }

  private skipPatterns(): number[][] {
    const patterns: number[][] = [];
    for (let start = 2; start <= 6; start += 1) {
      patterns.push(Array.from({ length: 5 }, (_, offset) => start + offset * 2));
    }
    patterns.unshift([1, 3, 5, 7, 9]);
    return patterns;
  }

  private makeRole(type: PokerRoleType, cards: Card[], pairRank?: Rank): PokerHand {
    const definition = ROLE_DEFINITIONS[type];
    const sortedCards = [...cards].sort((a, b) => cardKey(a).localeCompare(cardKey(b)));
    const discardKey = definition.discardScope === "rank" && pairRank
      ? `${type}:${pairRank}`
      : type;
    const name = type === "onePair" && pairRank
      ? `${pairRank}の${definition.name}`
      : definition.name;

    return {
      key: `${type}|${sortedCards.map(cardKey).join("|")}`,
      type,
      name,
      cards: sortedCards,
      baseScore: definition.score,
      rank: definition.rank,
      discardKey,
      pairRank,
    };
  }

  private uniqueRoles(roles: PokerHand[]): PokerHand[] {
    const seen = new Set<string>();
    return roles.filter((role) => {
      if (seen.has(role.key)) return false;
      seen.add(role.key);
      return true;
    });
  }

  private removeDominatedDuplicates(roles: PokerHand[]): PokerHand[] {
    const bestByExactCards = new Map<string, PokerHand>();
    for (const role of roles) {
      const exactCardsKey = role.cards.map(cardKey).sort().join("|");
      const current = bestByExactCards.get(exactCardsKey);
      if (!current || role.baseScore > current.baseScore) {
        bestByExactCards.set(exactCardsKey, role);
      }
    }
    const bestKeys = new Set(Array.from(bestByExactCards.values()).map((role) => role.key));
    return roles.filter((role) => bestKeys.has(role.key));
  }
}

function cardKey(card: Card): string {
  return `${card.rank}${card.suit}${card.id ? `#${card.id}` : ""}`;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];

  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index += 1) {
    const first = items[index];
    for (const rest of combinations(items.slice(index + 1), size - 1)) {
      result.push([first, ...rest]);
    }
  }
  return result;
}

function cartesian(groups: Card[][]): Card[][] {
  return groups.reduce<Card[][]>(
    (results, group) => results.flatMap((result) => group.map((card) => [...result, card])),
    [[]]
  );
}
