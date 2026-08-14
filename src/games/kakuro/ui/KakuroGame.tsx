import { useEffect, useMemo, useRef, useState } from "react";
import {
  GameFooter,
  MessagePanel,
} from "../../../common/components/GameChrome";
import {
  loadAssistSettings,
  saveAssistSettings,
} from "../../../common/storage/gameAssistSettings";
import {
  addCandidateNotes,
  analyzeDomains,
  applyHypothesisSequence,
  applyHypothesisValues,
  buildRuns,
  cleanCandidateNotes,
  clearCell,
  clearHypothesisCell,
  commitHypothesis,
  conflicts,
  discardHypothesis,
  enterHypothesisNumber,
  enterNumber,
  hypothesisSequences,
  initialKakuro,
  isComplete,
  isFixed,
  revealHint,
  runsForCell,
  selectHypothesisRun,
  startHypothesis,
  undoHypothesis,
  workingValues,
  type KakuroPuzzle,
  type KakuroState,
  type MemoLevel,
} from "../domain/kakuro";
import {
  deleteKakuroSession,
  loadKakuroSession,
  saveKakuroSession,
} from "../data/sessions";
type Phase = "loading" | "ask" | "play";
interface Assist {
  runHighlight: boolean;
  impossibleWarnings: boolean;
  hypothesisEnabled: boolean;
  memoLevel: MemoLevel;
}
const defaults: Assist = {
  runHighlight: true,
  impossibleWarnings: true,
  hypothesisEnabled: true,
  memoLevel: "cross",
};
export function KakuroGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: KakuroPuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<KakuroState>(() => initialKakuro(puzzle)),
    [phase, setPhase] = useState<Phase>("loading"),
    [message, setMessage] = useState("ゲームを開始しました。"),
    [assist, setAssist] = useState(() =>
      loadAssistSettings("kakuro", defaults),
    ),
    [settings, setSettings] = useState(false),
    [limit, setLimit] = useState(20),
    saved = useRef<KakuroState | undefined>(undefined),
    board = useRef<HTMLDivElement>(null),
    runs = useMemo(() => buildRuns(puzzle), [puzzle]),
    values = useMemo(() => workingValues(state), [state]),
    analysis = useMemo(
      () => analyzeDomains(puzzle, values, state.notes, true),
      [puzzle, values, state.notes],
    ),
    complete = isComplete(puzzle, state),
    active = state.hypothesis?.selectedRunId ?? null,
    sequences = active ? hypothesisSequences(puzzle, state, active) : [],
    selectedRuns =
      state.selected === null ? [] : runsForCell(puzzle, state.selected),
    bad = conflicts(puzzle, values);
  useEffect(() => {
    loadKakuroSession(puzzle)
      .then((found) => {
        saved.current = found;
        setPhase(found ? "ask" : "play");
      })
      .catch(() => setPhase("play"));
  }, [puzzle]);
  useEffect(() => {
    if (phase !== "play") return;
    if (complete) deleteKakuroSession(puzzle.id);
    else if (
      state.values.some((v, i) => v !== puzzle.givens[i]) ||
      state.notes.some((n) => n.length) ||
      state.hypothesis
    )
      saveKakuroSession(puzzle, state);
  }, [state, phase, complete, puzzle]);
  useEffect(() => saveAssistSettings("kakuro", assist), [assist]);
  function number(value: number) {
    const next = state.hypothesis
      ? enterHypothesisNumber(puzzle, state, value)
      : enterNumber(puzzle, state, value);
    setState(next);
    if (next !== state)
      setMessage(`${value} を${state.hypothesis ? "仮" : ""}入力しました。`);
  }
  function clear() {
    setState(
      state.hypothesis ? clearHypothesisCell(state) : clearCell(puzzle, state),
    );
  }
  function chooseRun(id: string) {
    setState(selectHypothesisRun(state, id));
    setLimit(20);
    setMessage("このランで成立する並びを列挙しました。");
  }
  function key(event: React.KeyboardEvent) {
    if (/^[1-9]$/.test(event.key)) number(Number(event.key));
    else if (["Delete", "Backspace", "0"].includes(event.key)) clear();
  }
  if (phase === "loading")
    return (
      <main className="shell">
        <section className="panel">保存状態を確認しています…</section>
      </main>
    );
  if (phase === "ask")
    return (
      <main className="shell">
        <section className="panel resume-dialog">
          <h1>保存済みの進捗</h1>
          <div className="actions">
            <button
              className="button"
              onClick={() => {
                setState(saved.current!);
                setPhase("play");
              }}
            >
              続きから
            </button>
            <button
              className="button secondary"
              onClick={() => {
                deleteKakuroSession(puzzle.id);
                setPhase("play");
              }}
            >
              最初から
            </button>
            <button className="button secondary" onClick={onBack}>
              キャンセル
            </button>
          </div>
        </section>
      </main>
    );
  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>カックロ</h1>
          <strong>{puzzle.title}</strong>
        </div>
        <div className="stats">
          <span>
            入力:{" "}
            {state.hypothesis
              ? "仮説"
              : state.inputMode === "note"
                ? "メモ"
                : "数字"}
          </span>
          <span>ヒント: {state.hintCount}回</span>
        </div>
        <div className="kakuro-play">
          <div className="kakuro-keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
              <button key={value} onClick={() => number(value)}>
                {value}
              </button>
            ))}
            <button className="wide" onClick={clear}>
              消去
            </button>
            <button
              className={`wide ${state.inputMode === "note" ? "active" : ""}`}
              disabled={Boolean(state.hypothesis)}
              onClick={() =>
                setState({
                  ...state,
                  inputMode: state.inputMode === "note" ? "value" : "note",
                })
              }
            >
              メモ {state.inputMode === "note" ? "ON" : "OFF"}
            </button>
            {assist.hypothesisEnabled && (
              <button
                className={`wide hypothesis-toggle ${state.hypothesis ? "active" : ""}`}
                onClick={() => {
                  setState(
                    state.hypothesis
                      ? discardHypothesis(state)
                      : startHypothesis(state),
                  );
                  setMessage(
                    state.hypothesis
                      ? "仮説を破棄しました。"
                      : "仮説探索を開始しました。",
                  );
                }}
              >
                仮説探索 {state.hypothesis ? "ON" : "OFF"}
              </button>
            )}
          </div>
          <div
            ref={board}
            className={`kakuro-board size-${puzzle.width}`}
            role="grid"
            tabIndex={0}
            onKeyDown={key}
            style={{
              gridTemplateColumns: `repeat(${puzzle.width},var(--kakuro-cell))`,
            }}
          >
            {puzzle.white.map((white, index) => {
              if (!white) {
                const clue = puzzle.clues.find((item) => item.index === index);
                return (
                  <button
                    key={index}
                    className={`kakuro-clue ${clue ? "has-clue" : "blank"}`}
                    aria-label={
                      clue
                        ? `下 ${clue.down ?? "なし"} 右 ${clue.right ?? "なし"}`
                        : "黒マス"
                    }
                    onClick={() => {
                      const choices = runs.filter(
                        (run) => run.clueIndex === index,
                      );
                      if (state.hypothesis && choices.length === 1)
                        chooseRun(choices[0].id);
                    }}
                  >
                    {clue?.down && (
                      <span className="down">
                        <b>↓</b>
                        {clue.down}
                      </span>
                    )}
                    {clue?.right && (
                      <span className="right">
                        <b>→</b>
                        {clue.right}
                      </span>
                    )}
                  </button>
                );
              }
              const trial = Boolean(
                  state.hypothesis?.trialValues[index] && !state.values[index],
                ),
                highlight =
                  assist.runHighlight &&
                  selectedRuns.some((run) => run.cells.includes(index)),
                activeLine =
                  active &&
                  runs.find((run) => run.id === active)?.cells.includes(index);
              return (
                <button
                  key={index}
                  role="gridcell"
                  aria-label={`${Math.floor(index / puzzle.width) + 1}行${(index % puzzle.width) + 1}列${values[index] ? ` ${values[index]}` : ""}`}
                  className={`kakuro-cell ${state.selected === index ? "selected" : ""} ${highlight ? "run-highlight" : ""} ${activeLine ? "hypothesis-line" : ""} ${trial ? "hypothetical" : ""} ${bad.has(index) ? "conflict" : ""} ${isFixed(puzzle, state, index) ? "fixed" : ""}`}
                  onClick={() => setState({ ...state, selected: index })}
                >
                  {values[index] || (
                    <span className="kakuro-notes">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                        <i key={value}>
                          {state.notes[index].includes(value) ? value : ""}
                        </i>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <MessagePanel
          message={
            complete
              ? `完成しました！（ヒント使用 ${state.hintCount}回）`
              : analysis.contradictionRunId && assist.impossibleWarnings
                ? "現在の入力では成立しないランがあります。"
                : message
          }
        />
        <div className="assist-settings">
          <button
            className="button secondary"
            onClick={() => setSettings(!settings)}
          >
            補助設定を{settings ? "閉じる" : "開く"}
          </button>
          {settings && (
            <div className="assist-settings-panel">
              <label>
                <input
                  type="checkbox"
                  checked={assist.runHighlight}
                  onChange={(e) =>
                    setAssist({ ...assist, runHighlight: e.target.checked })
                  }
                />
                交差ランを強調
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={assist.impossibleWarnings}
                  onChange={(e) =>
                    setAssist({
                      ...assist,
                      impossibleWarnings: e.target.checked,
                    })
                  }
                />
                矛盾を警告
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={assist.hypothesisEnabled}
                  onChange={(e) =>
                    setAssist({
                      ...assist,
                      hypothesisEnabled: e.target.checked,
                    })
                  }
                />
                仮説探索
              </label>
              <label>
                メモ整理
                <select
                  value={assist.memoLevel}
                  onChange={(e) =>
                    setAssist({
                      ...assist,
                      memoLevel: e.target.value as MemoLevel,
                    })
                  }
                >
                  <option value="basic">重複と合計</option>
                  <option value="run">ラン候補</option>
                  <option value="cross">交差伝播</option>
                </select>
              </label>
            </div>
          )}
        </div>
        {!state.hypothesis && (
          <section className="hint-panel">
            <h2>操作・ヒント</h2>
            <div className="actions">
              <button
                className="button secondary"
                disabled={state.selected === null}
                onClick={() =>
                  setState(addCandidateNotes(puzzle, state, assist.memoLevel))
                }
              >
                選択マスへ候補
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  const result = cleanCandidateNotes(
                    puzzle,
                    state,
                    assist.memoLevel,
                  );
                  setState(result.state);
                  setMessage(`候補を ${result.removed} 個整理しました。`);
                }}
              >
                メモ整理
              </button>
              <button
                className="button secondary"
                disabled={!analysis.forced.length}
                onClick={() => {
                  const item = analysis.forced[0];
                  setState({ ...state, selected: item.index });
                  setMessage(
                    `交差条件から ${item.value} に確定できるマスです。`,
                  );
                }}
              >
                確定候補
              </button>
              <button
                className="button"
                onClick={() => {
                  setState(revealHint(puzzle, state));
                  setMessage("正解の1マスを開示しました。");
                }}
              >
                1マス開示
              </button>
            </div>
          </section>
        )}
        {state.hypothesis && (
          <section className="hypothesis-panel">
            <div className="hypothesis-summary">
              <strong>仮説探索</strong>
              <span>段階 {state.hypothesis.history.length}</span>
              <span>
                仮入力 {state.hypothesis.trialValues.filter(Boolean).length}マス
              </span>
            </div>
            {state.selected !== null && !active && (
              <div className="actions">
                {selectedRuns.map((run) => (
                  <button
                    className="button secondary"
                    key={run.id}
                    onClick={() => chooseRun(run.id)}
                  >
                    {run.direction === "right" ? "横" : "縦"} 合計{run.total}
                    から考える
                  </button>
                ))}
              </div>
            )}
            {active && (
              <>
                <h3>成立する並び：{sequences.length}通り</h3>
                <div className="sequence-list">
                  {sequences.slice(0, limit).map((sequence) => (
                    <button
                      className="sequence-card"
                      key={sequence.join("-")}
                      onClick={() => {
                        setState(
                          applyHypothesisSequence(
                            puzzle,
                            state,
                            active,
                            sequence,
                          ),
                        );
                        setMessage("並びを仮入力しました。");
                      }}
                    >
                      {sequence.join(" · ")}
                    </button>
                  ))}
                </div>
                {sequences.length > limit && (
                  <button
                    className="button secondary"
                    onClick={() => setLimit(limit + 20)}
                  >
                    さらに表示
                  </button>
                )}
              </>
            )}
            {analysis.forced.length > 0 && (
              <div>
                <h3>交差伝播による確定候補：{analysis.forced.length}マス</h3>
                <button
                  className="button secondary"
                  onClick={() =>
                    setState(applyHypothesisValues(state, analysis.forced))
                  }
                >
                  すべて仮入力
                </button>
              </div>
            )}
            {analysis.contradictionRunId && (
              <p role="alert">成立する並びがなく、仮説が矛盾しています。</p>
            )}
            <div className="actions">
              <button
                className="button secondary"
                disabled={!state.hypothesis.history.length}
                onClick={() => setState(undoHypothesis(state))}
              >
                1段階戻す
              </button>
              <button
                className="button"
                onClick={() => setState(commitHypothesis(state))}
              >
                仮説を採用
              </button>
              <button
                className="button secondary"
                onClick={() => setState(discardHypothesis(state))}
              >
                破棄
              </button>
            </div>
          </section>
        )}
        <GameFooter onBack={onBack} onLauncher={onLauncher} />
      </section>
    </main>
  );
}
