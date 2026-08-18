import type { Card } from "../../../common/cards";
import { getInitialVisibleIndices, revealNextCard } from "./boardVisibility";
import { PokerHandDetector } from "./pokerHands";
import { DIFFICULTY_RULES } from "./roleDefinitions";
import {
  type DetectedRole,
  type PokerCollectorPuzzle,
  type PokerCollectorState,
  type PokerHand,
} from "./pokerHandTypes";
import { calculateTotalScore } from "./scorer";

const detector = new PokerHandDetector();

export function initialGame(puzzle: PokerCollectorPuzzle): PokerCollectorState {
  return {
    difficulty: puzzle.difficulty,
    cards: [...puzzle.cardsLayout],
    visibleIndices: getInitialVisibleIndices(),
    hand: [],
    takenCardIndices: new Set(),
    fixedRoles: [],
    pendingRoles: [],
    discardedRoleKeys: new Set(),
    score: 0,
    holdCount: 0,
    graceTurnsRemaining: 0,
    graceReason: null,
    retriesRemaining: puzzle.allowedRetries,
    history: [],
  };
}

export function normalizePokerState(
  state: Partial<PokerCollectorState> & Pick<PokerCollectorState, "cards" | "visibleIndices" | "hand">,
  puzzle: PokerCollectorPuzzle
): PokerCollectorState {
  return {
    difficulty: state.difficulty ?? puzzle.difficulty,
    cards: state.cards ?? [...puzzle.cardsLayout],
    visibleIndices: state.visibleIndices ?? getInitialVisibleIndices(),
    hand: state.hand ?? [],
    takenCardIndices: toSet(state.takenCardIndices),
    fixedRoles: state.fixedRoles ?? [],
    pendingRoles: state.pendingRoles ?? [],
    discardedRoleKeys: toSet(state.discardedRoleKeys),
    score: state.score ?? 0,
    holdCount: state.holdCount ?? 0,
    graceTurnsRemaining: state.graceTurnsRemaining ?? 0,
    graceReason: state.graceReason ?? null,
    retriesRemaining: state.retriesRemaining ?? puzzle.allowedRetries,
    history: state.history ?? [],
  };
}

export function takeCard(
  state: PokerCollectorState,
  cardIndex: number
): PokerCollectorState {
  if (
    state.pendingRoles.length > 0 ||
    !state.visibleIndices.includes(cardIndex) ||
    state.takenCardIndices.has(cardIndex)
  ) {
    return state;
  }

  const rolesBefore = detector.detectAllRoles(
    state.hand,
    state.difficulty,
    state.discardedRoleKeys
  );

  const card = state.cards[cardIndex];
  const newState: PokerCollectorState = {
    ...state,
    hand: [...state.hand, card],
    takenCardIndices: new Set([...state.takenCardIndices, cardIndex]),
    visibleIndices: state.visibleIndices.filter((idx) => idx !== cardIndex),
    pendingRoles: [],
    history: [...state.history, { type: "takeCard", cardIndex }],
  };

  const allIndices = Array.from({ length: state.cards.length }, (_, index) => index);
  newState.visibleIndices = revealNextCard(
    newState.visibleIndices,
    allIndices,
    newState.takenCardIndices
  );

  const rolesAfter = detector.detectAllRoles(
    newState.hand,
    newState.difficulty,
    newState.discardedRoleKeys
  );
  const boardEmpty = newState.takenCardIndices.size >= newState.cards.length;

  if (boardEmpty) {
    newState.graceTurnsRemaining = 0;
    newState.graceReason = null;
    newState.pendingRoles = rolesAfter;
    return newState;
  }

  if (newState.graceTurnsRemaining > 0) {
    newState.graceTurnsRemaining -= 1;
    if (newState.graceTurnsRemaining === 0) {
      newState.graceReason = null;
      newState.pendingRoles = rolesAfter;
    }
    return newState;
  }

  const newlyEstablished = rolesBefore.length === 0 && rolesAfter.length > 0;
  if (newlyEstablished) {
    const grace = DIFFICULTY_RULES[newState.difficulty].roleGraceTurns;
    if (grace > 0) {
      newState.graceTurnsRemaining = grace;
      newState.graceReason = "role";
      return newState;
    }
  }

  newState.pendingRoles = rolesAfter;
  return newState;
}

export function confirmRole(
  state: PokerCollectorState,
  roleKey: string
): PokerCollectorState {
  const role = state.pendingRoles.find((candidate) => candidate.key === roleKey);
  if (!role) return state;

  const confirmedRole: DetectedRole = { ...role, isConfirmed: true };
  const consumed = new Set(role.cards.map(cardIdentity));
  const hand = state.hand.filter((card) => !consumed.has(cardIdentity(card)));
  const fixedRoles = [...state.fixedRoles, confirmedRole];
  const boardEmpty = state.takenCardIndices.size >= state.cards.length;
  const rules = DIFFICULTY_RULES[state.difficulty];

  const newState: PokerCollectorState = {
    ...state,
    hand,
    fixedRoles,
    pendingRoles: [],
    score: calculateTotalScore(fixedRoles),
    graceTurnsRemaining: boardEmpty ? 0 : rules.confirmedGraceTurns,
    graceReason: boardEmpty || rules.confirmedGraceTurns === 0 ? null : "confirmed",
    history: [...state.history, { type: "confirmRole", roleKey }],
  };

  if (boardEmpty || rules.confirmedGraceTurns === 0) {
    newState.pendingRoles = detector.detectAllRoles(
      newState.hand,
      newState.difficulty,
      newState.discardedRoleKeys
    );
  }

  return newState;
}

export function holdRole(state: PokerCollectorState): PokerCollectorState {
  const rules = DIFFICULTY_RULES[state.difficulty];
  const boardEmpty = state.takenCardIndices.size >= state.cards.length;
  if (state.pendingRoles.length === 0 || state.holdCount >= rules.maxHolds || boardEmpty) {
    return state;
  }

  return {
    ...state,
    holdCount: state.holdCount + 1,
    pendingRoles: [],
    graceTurnsRemaining: rules.holdExtensionTurns,
    graceReason: "hold",
    history: [...state.history, { type: "holdRole" }],
  };
}

export function discardRole(
  state: PokerCollectorState,
  roleKey: string
): PokerCollectorState {
  const role = state.pendingRoles.find((candidate) => candidate.key === roleKey);
  if (!role) return state;

  const discardedRoleKeys = new Set(state.discardedRoleKeys);
  discardedRoleKeys.add(role.discardKey);

  return {
    ...state,
    discardedRoleKeys,
    // 破棄は、その時点の役選択フェーズを終了する。
    // 次のカード取得時に通常どおり再判定する。
    pendingRoles: [],
    history: [...state.history, { type: "discardRole", discardKey: role.discardKey }],
  };
}

export function getCurrentRoles(state: PokerCollectorState): PokerHand[] {
  return detector.detectAllRoles(state.hand, state.difficulty, state.discardedRoleKeys);
}

export function isGameComplete(state: PokerCollectorState, targetScore: number): boolean {
  return state.score >= targetScore;
}

export function isGameOver(state: PokerCollectorState): boolean {
  return state.takenCardIndices.size >= state.cards.length && state.pendingRoles.length === 0;
}

export function canRetry(state: PokerCollectorState): boolean {
  return state.retriesRemaining > 0;
}

export function retry(
  state: PokerCollectorState,
  puzzle: PokerCollectorPuzzle
): PokerCollectorState {
  if (!canRetry(state)) return state;

  const newState = initialGame(puzzle);
  newState.retriesRemaining = state.retriesRemaining - 1;
  return newState;
}

function cardIdentity(card: Card): string {
  return card.id ? `${card.rank}${card.suit}#${card.id}` : `${card.rank}${card.suit}`;
}

function toSet<T>(value: ReadonlySet<T> | undefined): Set<T> {
  if (!value) return new Set<T>();
  return value instanceof Set ? new Set(value) : new Set<T>();
}
