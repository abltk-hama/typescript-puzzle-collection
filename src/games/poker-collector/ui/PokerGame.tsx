import { useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "../../../common/cards";
import { cardToString } from "../../../common/cards";
import {
  GameFooter,
  MessagePanel,
} from "../../../common/components/GameChrome";
import {
  deletePokerSession,
  loadPokerSession,
  savePokerSession,
} from "../data/sessions";
import {
  confirmRole,
  discardRole,
  holdRole,
  initialGame,
  isGameComplete,
  isGameOver,
  normalizePokerState,
  retry,
  takeCard,
} from "../domain/pokerCollector";
import { DIFFICULTY_RULES } from "../domain/roleDefinitions";
import { calculateScoreBreakdown } from "../domain/scorer";
import { detectPlanningRoles, findBestVisibleRolePlan } from "../domain/planning";
import type {
  PokerCollectorPuzzle,
  PokerCollectorState,
} from "../domain/pokerHandTypes";
import { RoleConfirmDialog } from "./RoleConfirmDialog";

type Phase = "loading" | "ask" | "play";

export function PokerGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: PokerCollectorPuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<PokerCollectorState>(() => initialGame(puzzle));
  const [message, setMessage] = useState("ゲームを開始しました。");
  const [phase, setPhase] = useState<Phase>("loading");
  const [gameResult, setGameResult] = useState<"won" | "lost" | null>(null);
  const [planningActive, setPlanningActive] = useState(false);
  const [activePlanningGroup, setActivePlanningGroup] = useState<0 | 1 | 2>(0);
  const [planningGroups, setPlanningGroups] = useState<number[][]>([[], [], []]);
  const [hintRoleName, setHintRoleName] = useState<string | null>(null);
  const [hintCardIndices, setHintCardIndices] = useState<number[]>([]);

  const saved = useRef<PokerCollectorState | undefined>(undefined);
  const complete = isGameComplete(state, puzzle.targetScore);
  const over = isGameOver(state);
  const rules = DIFFICULTY_RULES[state.difficulty];
  const boardRemaining = state.cards.length - state.takenCardIndices.size;
  const holdCountRemaining = rules.maxHolds - state.holdCount;

  useEffect(() => {
    loadPokerSession(puzzle)
      .then((found: PokerCollectorState | undefined) => {
        saved.current = found ? normalizePokerState(found, puzzle) : undefined;
        setPhase(found ? "ask" : "play");
      })
      .catch(() => setPhase("play"));
  }, [puzzle]);

  useEffect(() => {
    if (phase !== "play") return;

    if (complete) {
      void deletePokerSession(puzzle);
      setGameResult("won");
    } else if (over) {
      void deletePokerSession(puzzle);
      setGameResult("lost");
    } else {
      void savePokerSession(puzzle, state);
    }
  }, [state, phase, puzzle, complete, over]);

  const scoreBreakdown = useMemo(
    () => calculateScoreBreakdown(state.fixedRoles),
    [state.fixedRoles]
  );

  const visibleBoardEntries = useMemo(
    () => state.visibleIndices
      .filter((idx) => !state.takenCardIndices.has(idx))
      .map((idx) => ({ index: idx, card: state.cards[idx] })),
    [state.cards, state.visibleIndices, state.takenCardIndices]
  );

  const visibleBoardCards = useMemo(
    () => visibleBoardEntries.map((entry) => entry.card),
    [visibleBoardEntries]
  );

  const visibleRoleCandidates = useMemo(
    () => planningActive
      ? detectPlanningRoles(visibleBoardCards, state.difficulty, state.discardedRoleKeys)
      : [],
    [planningActive, visibleBoardCards, state.difficulty, state.discardedRoleKeys]
  );

  const planningRoleGroups = useMemo(
    () => planningActive
      ? planningGroups.map((indices) =>
          detectPlanningRoles(
            indices.map((idx) => state.cards[idx]),
            state.difficulty,
            state.discardedRoleKeys
          )
        )
      : [[], [], []],
    [planningActive, planningGroups, state.cards, state.difficulty, state.discardedRoleKeys]
  );

  function clearPlanning() {
    setPlanningActive(false);
    setPlanningGroups([[], [], []]);
    setActivePlanningGroup(0);
    setHintRoleName(null);
    setHintCardIndices([]);
  }

  function togglePlanning() {
    if (state.pendingRoles.length > 0) {
      setMessage("成立中の役を先に処理してください。");
      return;
    }
    if (planningActive) {
      clearPlanning();
      setMessage("仮持ち札を解除しました。ゲームに戻ります。");
      return;
    }
    setPlanningActive(true);
    setMessage("仮持ち札モードです。表向きカードを3グループまで自由に振り分けられます。");
  }

  function handlePlanningCardClick(idx: number) {
    if (!planningActive || !state.visibleIndices.includes(idx) || state.takenCardIndices.has(idx)) return;

    setPlanningGroups((current) => {
      const next = current.map((group) => group.filter((cardIndex) => cardIndex !== idx));
      if (!current[activePlanningGroup].includes(idx)) {
        next[activePlanningGroup] = [...next[activePlanningGroup], idx];
      }
      return next;
    });
  }

  function assignRoleToPlanningGroup(roleKey: string) {
    const role = visibleRoleCandidates.find((candidate) => candidate.key === roleKey);
    if (!role) return;
    const roleIndices = role.cards
      .map((card) => visibleBoardEntries.find((entry) => cardIdentity(entry.card) === cardIdentity(card))?.index)
      .filter((idx): idx is number => idx !== undefined);

    setPlanningGroups((current) => {
      const roleSet = new Set(roleIndices);
      const next = current.map((group, groupIndex) =>
        groupIndex === activePlanningGroup ? [] : group.filter((idx) => !roleSet.has(idx))
      );
      next[activePlanningGroup] = roleIndices;
      return next;
    });
    setMessage(`${role.name}を仮グループ${activePlanningGroup + 1}に登録しました。`);
  }

  function showRoleHint() {
    const plan = findBestVisibleRolePlan(visibleBoardCards, state.difficulty, state.discardedRoleKeys);
    if (plan.roles.length === 0) {
      setHintRoleName(null);
      setMessage("現在見えている盤面には得点できる役の組み合わせがありません。");
      return;
    }
    setHintRoleName(plan.roles[0].name);
    setMessage("役ヒントを表示しました。最大得点候補の中から1役だけ示しています。");
  }

  function showCardHint() {
    const plan = findBestVisibleRolePlan(visibleBoardCards, state.difficulty, state.discardedRoleKeys);
    if (plan.roles.length === 0) {
      setHintCardIndices([]);
      setMessage("現在見えている盤面には得点できる役の組み合わせがありません。");
      return;
    }
    const indices = plan.roles
      .map((role) => role.cards[0])
      .map((card) => visibleBoardEntries.find((entry) => cardIdentity(entry.card) === cardIdentity(card))?.index)
      .filter((idx): idx is number => idx !== undefined);
    setHintCardIndices(Array.from(new Set(indices)));
    setMessage(`カードヒントを表示しました。最大得点候補の各役から1枚ずつ示しています。`);
  }

  function handleCardClick(idx: number) {
    if (planningActive) {
      handlePlanningCardClick(idx);
      return;
    }
    if (state.pendingRoles.length > 0) {
      setMessage("成立中の役を先に処理してください。");
      return;
    }
    if (!state.visibleIndices.includes(idx) || state.takenCardIndices.has(idx)) {
      setMessage("そのカードは取得できません。");
      return;
    }

    setHintRoleName(null);
    setHintCardIndices([]);
    const newState = takeCard(state, idx);
    setState(newState);

    if (newState.pendingRoles.length > 0) {
      setMessage(`${newState.pendingRoles.length}件の役候補が成立しています。`);
    } else if (newState.graceTurnsRemaining > 0) {
      setMessage(`猶予中です。あと${newState.graceTurnsRemaining}手。`);
    } else {
      setMessage(`${cardToString(state.cards[idx])}を取得しました。`);
    }
  }

  function handleConfirmRole(roleKey: string) {
    const selected = state.pendingRoles.find((role) => role.key === roleKey);
    if (!selected) return;

    const newState = confirmRole(state, roleKey);
    setState(newState);
    setMessage(
      `${selected.name}を確定しました。${selected.cards.length}枚を使用して+${selected.baseScore}点。`
    );
  }

  function handleHoldRole() {
    if (holdCountRemaining <= 0) {
      setMessage("保留回数を使い切っています。");
      return;
    }
    if (boardRemaining <= 0) {
      setMessage("盤面が空のため、これ以上保留できません。");
      return;
    }

    const newState = holdRole(state);
    setState(newState);
    setMessage(`役を保留しました。あと${newState.graceTurnsRemaining}手待てます。`);
  }

  function handleDiscardRole(roleKey: string) {
    const selected = state.pendingRoles.find((role) => role.key === roleKey);
    if (!selected) return;

    const newState = discardRole(state, roleKey);
    setState(newState);
    setMessage(`${selected.name}を破棄しました。このゲームでは同じ破棄単位の役を得点できません。`);
  }

  function handleRetry() {
    if (state.retriesRemaining <= 0) {
      setMessage("やり直しの回数が終了しました。");
      return;
    }

    const newState = retry(state, puzzle);
    setState(newState);
    setGameResult(null);
    setMessage("ゲームをやり直しました。");
  }

  if (phase === "ask" && saved.current) {
    return (
      <main className="shell">
        <section className="panel">
          <div className="toolbar">
            <h1>ポーカーコレクター</h1>
          </div>
          <div style={{ margin: "24px 0" }}>
            <p>前回のゲームを続けますか？</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="button"
                onClick={() => {
                  setState(saved.current!);
                  setPhase("play");
                }}
              >
                続ける
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  void deletePokerSession(puzzle);
                  setState(initialGame(puzzle));
                  setPhase("play");
                }}
              >
                新しく開始
              </button>
            </div>
          </div>
          <GameFooter onBack={onBack} onLauncher={onLauncher} />
        </section>
      </main>
    );
  }

  if (gameResult === "won") {
    return (
      <main className="shell">
        <section className="panel">
          <div className="toolbar"><h1>ポーカーコレクター</h1></div>
          <div className="game-result-panel success">
            <h2>クリア！</h2>
            <p>
              目標得点 {puzzle.targetScore}点を達成しました！
              <br />
              最終得点: {state.score}点
            </p>
            <div style={{ marginTop: "16px", textAlign: "left" }}>
              <strong>役一覧:</strong>
              <ul>
                {state.fixedRoles.map((role, idx) => (
                  <li key={`${role.key ?? role.name}-${idx}`}>
                    {role.name}: +{role.baseScore}点
                  </li>
                ))}
              </ul>
              {scoreBreakdown.bonusScore > 0 && (
                <div style={{ color: "#059669", fontWeight: "bold" }}>
                  ボーナス（{state.fixedRoles.length}役）: +{scoreBreakdown.bonusScore}点
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <button className="button" onClick={onBack}>別のゲーム</button>
            <button className="button secondary" onClick={onLauncher}>ランチャーへ</button>
          </div>
          <GameFooter onBack={onBack} onLauncher={onLauncher} />
        </section>
      </main>
    );
  }

  if (gameResult === "lost") {
    return (
      <main className="shell">
        <section className="panel">
          <div className="toolbar"><h1>ポーカーコレクター</h1></div>
          <div className="game-result-panel failure">
            <h2>ゲームオーバー</h2>
            <p>
              目標得点 {puzzle.targetScore}点に達することができませんでした。
              <br />
              最終得点: {state.score}点
            </p>
            <p>やり直し可能回数: {state.retriesRemaining}/{puzzle.allowedRetries}</p>
          </div>
          <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            {state.retriesRemaining > 0 && (
              <button className="button" onClick={handleRetry}>もう一度チャレンジ</button>
            )}
            <button className="button secondary" onClick={onBack}>別のゲーム</button>
            <button className="button secondary" onClick={onLauncher}>ランチャーへ</button>
          </div>
          <GameFooter onBack={onBack} onLauncher={onLauncher} />
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>ポーカーコレクター</h1>
          <div className="score-display">
            <span>得点: {state.score} / {puzzle.targetScore}</span>
            <span>保留: {holdCountRemaining}/{rules.maxHolds}</span>
            <span>やり直し: {state.retriesRemaining}/{puzzle.allowedRetries}</span>
          </div>
        </div>

        {state.graceTurnsRemaining > 0 && (
          <div className="poker-grace-banner">
            猶予中：あと<strong>{state.graceTurnsRemaining}手</strong>
            {state.graceReason === "role" && "（役成立後）"}
            {state.graceReason === "confirmed" && "（役確定後）"}
            {state.graceReason === "hold" && "（保留による延長）"}
          </div>
        )}

        <section className="poker-assist-area">
          <div className="poker-assist-toolbar">
            <button
              className={`button ${planningActive ? "secondary" : ""}`}
              onClick={togglePlanning}
              disabled={!planningActive && state.pendingRoles.length > 0}
            >
              {planningActive ? "仮持ち札を解除" : "仮持ち札"}
            </button>
            <button className="button secondary" onClick={showRoleHint}>役ヒント</button>
            <button className="button secondary" onClick={showCardHint}>カードヒント</button>
          </div>
          {(hintRoleName || hintCardIndices.length > 0) && (
            <div className="poker-hint-summary">
              {hintRoleName && <span>役ヒント：<strong>{hintRoleName}</strong></span>}
              {hintCardIndices.length > 0 && <span>カードヒント：盤面の強調カードを確認してください。</span>}
            </div>
          )}

          {planningActive && (
            <div className="planning-workspace">
              <div className="planning-mode-note">
                考察モード中：盤面を選んでもゲームは進行しません。カードは最大3グループに振り分けられます。
              </div>
              <div className="planning-groups">
                {planningGroups.map((group, groupIndex) => (
                  <button
                    key={groupIndex}
                    type="button"
                    className={`planning-group ${activePlanningGroup === groupIndex ? "active" : ""}`}
                    onClick={() => setActivePlanningGroup(groupIndex as 0 | 1 | 2)}
                  >
                    <strong>仮グループ{groupIndex + 1}（{group.length}枚）</strong>
                    <span className="planning-group-cards">
                      {group.length === 0
                        ? "カード未選択"
                        : group.map((idx) => cardToString(state.cards[idx])).join(" / ")}
                    </span>
                    <span className="planning-group-roles">
                      {planningRoleGroups[groupIndex].length === 0
                        ? "成立役なし"
                        : `成立役：${planningRoleGroups[groupIndex].slice(0, 4).map((role) => role.name).join("、")}${planningRoleGroups[groupIndex].length > 4 ? "…" : ""}`}
                    </span>
                  </button>
                ))}
              </div>

              <div className="planning-role-search">
                <h4>現在の盤面で成立する役</h4>
                {visibleRoleCandidates.length === 0 ? (
                  <span className="muted">現在見えているカードだけでは役が成立しません。</span>
                ) : (
                  <div className="planning-role-candidates">
                    {visibleRoleCandidates.map((role) => (
                      <button
                        key={role.key}
                        type="button"
                        className="planning-role-candidate"
                        onClick={() => assignRoleToPlanningGroup(role.key)}
                      >
                        <span><strong>{role.name}</strong><small>{role.cards.map(cardToString).join(" / ")}</small></span>
                        <span>G{activePlanningGroup + 1}へ</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="poker-game-area">
          <div className="board-area">
            <h3>盤面（{boardRemaining}枚）</h3>
            <div className="board-wrap poker-board-wrap">
              <div className="poker-board">
                {state.cards.map((card: Card, idx: number) => {
                  if (state.takenCardIndices.has(idx)) return null;

                  const isVisible = state.visibleIndices.includes(idx);
                  const isRed = card.suit === "♥" || card.suit === "♦";

                  return (
                    <button
                      key={idx}
                      className={`poker-card ${isVisible ? "visible" : "hidden"} ${isVisible && isRed ? "red" : ""} ${planningGroups.some((group) => group.includes(idx)) ? "planning-selected" : ""} ${hintCardIndices.includes(idx) ? "hint-card" : ""}`}
                      onClick={() => handleCardClick(idx)}
                      disabled={!isVisible || (!planningActive && state.pendingRoles.length > 0)}
                      title={isVisible ? cardToString(card) : "裏向きのカード"}
                    >
                      {isVisible ? (
                        <>
                          <span className="card-rank">{card.rank}</span>
                          <span className="card-suit">{card.suit}</span>
                        </>
                      ) : (
                        <span className="card-back-mark">◆</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="poker-status">
            <article className="hand-area">
              <h3>未確定の手札（{state.hand.length}枚）</h3>
              <div className="hand-cards">
                {state.hand.length === 0 && <span className="muted">手札はありません</span>}
                {state.hand.map((card: Card, idx: number) => (
                  <PlayingCard key={`${cardToString(card)}-${idx}`} card={card} />
                ))}
              </div>
            </article>

            <article className="roles-area">
              <h3>確定した役（{state.fixedRoles.length}個）</h3>
              <div className="confirmed-role-groups">
                {state.fixedRoles.length === 0 && <span className="muted">まだ役を確定していません</span>}
                {state.fixedRoles.map((role, idx) => (
                  <div key={`${role.key ?? role.name}-${idx}`} className="confirmed-role-group">
                    <div className="role-item confirmed">
                      <span className="role-name">{role.name}</span>
                      <span className="role-score">+{role.baseScore}点</span>
                    </div>
                    <div className="confirmed-role-cards">
                      {role.cards.map((card, cardIndex) => (
                        <PlayingCard
                          key={`${cardToString(card)}-${cardIndex}`}
                          card={card}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {scoreBreakdown.bonusScore > 0 && (
                <div className="bonus-indicator">
                  ボーナス ({state.fixedRoles.length}役): +{scoreBreakdown.bonusScore}点
                </div>
              )}
            </article>
          </div>

          <article className="discarded-roles-area">
            <h3>破棄した役（{state.discardedRoleKeys.size}個）</h3>
            {state.discardedRoleKeys.size === 0 ? (
              <span className="muted">破棄した役はありません</span>
            ) : (
              <div className="discarded-role-chips">
                {Array.from(state.discardedRoleKeys).map((key) => (
                  <span key={key} className="discarded-role-chip">{formatDiscardKey(key)}</span>
                ))}
              </div>
            )}
          </article>
        </div>

        {state.pendingRoles.length > 0 && (
          <RoleConfirmDialog
            detectedRoles={state.pendingRoles}
            holdCountRemaining={holdCountRemaining}
            canHold={boardRemaining > 0}
            onConfirm={handleConfirmRole}
            onHold={handleHoldRole}
            onDiscard={handleDiscardRole}
          />
        )}

        <MessagePanel message={message} logKey="poker_collector" />
        <GameFooter onBack={onBack} onLauncher={onLauncher} />
      </section>
    </main>
  );
}

function PlayingCard({ card, compact = false }: { card: Card; compact?: boolean }) {
  const isRed = card.suit === "♥" || card.suit === "♦";
  return (
    <div className={`hand-card ${isRed ? "red" : ""} ${compact ? "compact" : ""}`}>
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{card.suit}</span>
    </div>
  );
}

function formatDiscardKey(key: string): string {
  const names: Record<string, string> = {
    onePair: "ワンペア",
    twoPair: "ツーペア",
    threeOfAKind: "スリーオブアカインド",
    fourCardStraight: "4枚ストレート",
    fourCardFlush: "4枚フラッシュ",
    skipStraight: "飛び地ストレート",
    straight: "ストレート",
    flush: "フラッシュ",
    fullHouse: "フルハウス",
    fourOfAKind: "フォーオブアカインド",
    straightFlush: "ストレートフラッシュ",
    royalFlush: "ロイヤルフラッシュ",
  };
  const [type, rank] = key.split(":");
  if (type === "onePair" && rank) return `${rank}のワンペア`;
  return names[type] ?? key;
}

function cardIdentity(card: Card): string {
  return card.id ? `${card.rank}${card.suit}#${card.id}` : `${card.rank}${card.suit}`;
}
