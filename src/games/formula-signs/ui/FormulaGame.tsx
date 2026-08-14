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
  addNotes,
  analyzeFormula,
  applyAssignment,
  applyForced,
  clearValue,
  commitHypothesis,
  discardHypothesis,
  enterHypothesis,
  enterValue,
  expressionsForCell,
  initialFormula,
  isComplete,
  revealHint,
  selectHypothesisExpression,
  startHypothesis,
  undoHypothesis,
  workingNumbers,
  workingOperators,
  type FormulaPuzzle,
  type FormulaState,
  type Operator,
} from "../domain/formulaSigns";
import {
  deleteFormulaSession,
  loadFormulaSession,
  saveFormulaSession,
} from "../data/sessions";
type Phase = "loading" | "ask" | "play";
interface Assist {
  expressionHighlight: boolean;
  contradictionWarning: boolean;
  hypothesisEnabled: boolean;
}
const defaults: Assist = {
    expressionHighlight: true,
    contradictionWarning: true,
    hypothesisEnabled: true,
  },
  symbol = (op: Operator | null) => (op === "*" ? "×" : (op ?? ""));
export function FormulaGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: FormulaPuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<FormulaState>(() =>
      initialFormula(puzzle),
    ),
    [phase, setPhase] = useState<Phase>("loading"),
    [message, setMessage] = useState("数字の間へ演算記号を入れてください。"),
    [assist, setAssist] = useState(() =>
      loadAssistSettings("formula_signs", defaults),
    ),
    [settings, setSettings] = useState(false),
    [limit, setLimit] = useState(20),
    saved = useRef<FormulaState | undefined>(undefined),
    numbers = useMemo(() => workingNumbers(state), [state]),
    operators = useMemo(() => workingOperators(state), [state]),
    analysis = useMemo(
      () =>
        analyzeFormula(
          puzzle,
          numbers,
          operators,
          state.numberNotes,
          state.operatorNotes,
        ),
      [puzzle, numbers, operators, state.numberNotes, state.operatorNotes],
    ),
    complete = isComplete(puzzle, state),
    activeId = state.hypothesis?.selectedExpressionId ?? null,
    active = puzzle.expressions.find((e) => e.id === activeId),
    selectedExpressions =
      state.selected === null ? [] : expressionsForCell(puzzle, state.selected);
  useEffect(() => {
    loadFormulaSession(puzzle)
      .then((found) => {
        saved.current = found;
        setPhase(found ? "ask" : "play");
      })
      .catch(() => setPhase("play"));
  }, [puzzle]);
  useEffect(() => {
    if (phase !== "play") return;
    if (complete) deleteFormulaSession(puzzle.id);
    else if (
      state.numbers.some((v, i) => v !== puzzle.numberGivens[i]) ||
      state.operators.some((v, i) => v !== puzzle.operatorGivens[i]) ||
      state.hypothesis
    )
      saveFormulaSession(puzzle, state);
  }, [state, phase, complete, puzzle]);
  useEffect(() => saveAssistSettings("formula_signs", assist), [assist]);
  function input(value: number | Operator) {
    const next = state.hypothesis
      ? enterHypothesis(state, value)
      : enterValue(puzzle, state, value);
    setState(next);
    if (next !== state)
      setMessage(
        `${typeof value === "number" ? value : symbol(value)} を${state.hypothesis ? "仮" : ""}入力しました。`,
      );
  }
  function expressionLabel(id: string) {
    const e = puzzle.expressions.find((x) => x.id === id)!;
    return `${e.direction === "horizontal" ? "横" : "縦"}の式（目標 ${e.target}）`;
  }
  function targetAt(direction: "horizontal" | "vertical", unit: number) {
    return puzzle.expressions.find(
      (e) =>
        e.direction === direction &&
        (direction === "horizontal"
          ? Math.floor(e.cells[0] / puzzle.width)
          : e.cells[0] % puzzle.width) === unit,
    );
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
                deleteFormulaSession(puzzle.id);
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
          <h1>数式符号パズル</h1>
          <strong>{puzzle.title}</strong>
        </div>
        <div className="stats">
          <span>
            入力:{" "}
            {state.hypothesis
              ? "仮説"
              : state.selected !== null &&
                  puzzle.cells[state.selected] === "number"
                ? "数字"
                : "演算子"}
          </span>
          <span>ヒント: {state.hintCount}回</span>
        </div>
        <div className="formula-play">
          <div className="formula-keypads">
            <div className="operator-keypad">
              {puzzle.allowedOperators.map((op) => (
                <button key={op} onClick={() => input(op)}>
                  {symbol(op)}
                </button>
              ))}
            </div>
            {puzzle.difficulty === "challenge" && (
              <div className="number-keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                  <button key={value} onClick={() => input(value)}>
                    {value}
                  </button>
                ))}
              </div>
            )}
            <button
              className="button secondary"
              onClick={() => setState(clearValue(puzzle, state))}
            >
              消去
            </button>
            {assist.hypothesisEnabled && (
              <button
                className={`button hypothesis-toggle ${state.hypothesis ? "active" : ""}`}
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
            className={`formula-board size-${puzzle.width}`}
            role="grid"
            style={{
              gridTemplateColumns: `repeat(${puzzle.width},var(--formula-cell)) var(--formula-target)`,
            }}
          >
            {Array.from({ length: puzzle.height }, (_, row) => [
              ...Array.from({ length: puzzle.width }, (_, column) => {
                const index = row * puzzle.width + column,
                  kind = puzzle.cells[index],
                  value = kind === "number" ? numbers[index] : null,
                  op = kind === "operator" ? operators[index] : null,
                  highlight =
                    assist.expressionHighlight &&
                    selectedExpressions.some((e) => e.cells.includes(index)),
                  activeCell = active?.cells.includes(index);
                if (kind === "block")
                  return <span className="formula-block" key={index} />;
                return (
                  <button
                    role="gridcell"
                    aria-label={`${row + 1}行${column + 1}列 ${kind === "number" ? "数字" : "演算子"} ${value || symbol(op)}`}
                    key={index}
                    className={`formula-cell ${kind} ${state.selected === index ? "selected" : ""} ${highlight ? "expression-highlight" : ""} ${activeCell ? "hypothesis-line" : ""} ${state.hinted.includes(index) ? "hinted" : ""} ${state.hypothesis && (state.hypothesis.numbers[index] || state.hypothesis.operators[index]) ? "hypothetical" : ""}`}
                    onClick={() => setState({ ...state, selected: index })}
                  >
                    {kind === "number"
                      ? value || (
                          <span className="formula-notes">
                            {state.numberNotes[index].join(" ")}
                          </span>
                        )
                      : symbol(op) || (
                          <span className="formula-notes">
                            {state.operatorNotes[index].map(symbol).join(" ")}
                          </span>
                        )}
                  </button>
                );
              }),
              (() => {
                const e = targetAt("horizontal", row);
                return e ? (
                  <button
                    key={`r${row}`}
                    className={`formula-target ${activeId === e.id ? "active" : ""}`}
                    onClick={() =>
                      state.hypothesis &&
                      setState(selectHypothesisExpression(state, e.id))
                    }
                  >
                    = {e.target}
                  </button>
                ) : (
                  <span key={`r${row}`} />
                );
              })(),
            ])}
            {Array.from({ length: puzzle.width }, (_, column) => {
              const e = targetAt("vertical", column);
              return e ? (
                <button
                  key={`c${column}`}
                  className={`formula-target ${activeId === e.id ? "active" : ""}`}
                  onClick={() =>
                    state.hypothesis &&
                    setState(selectHypothesisExpression(state, e.id))
                  }
                >
                  ↓ {e.target}
                </button>
              ) : (
                <span key={`c${column}`} />
              );
            })}
            <span />
          </div>
        </div>
        <MessagePanel
          message={
            complete
              ? `完成しました！（ヒント使用 ${state.hintCount}回）`
              : analysis.contradictionExpressionId &&
                  assist.contradictionWarning
                ? `${expressionLabel(analysis.contradictionExpressionId)}が成立しません。`
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
                  checked={assist.expressionHighlight}
                  onChange={(e) =>
                    setAssist({
                      ...assist,
                      expressionHighlight: e.target.checked,
                    })
                  }
                />
                所属する式を強調
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={assist.contradictionWarning}
                  onChange={(e) =>
                    setAssist({
                      ...assist,
                      contradictionWarning: e.target.checked,
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
            </div>
          )}
        </div>
        {!state.hypothesis && (
          <section className="hint-panel">
            <h2>候補・ヒント</h2>
            <div className="actions">
              <button
                className="button secondary"
                disabled={state.selected === null}
                onClick={() => setState(addNotes(puzzle, state))}
              >
                選択マスへ候補
              </button>
              <button
                className="button secondary"
                disabled={
                  !analysis.forcedNumbers.length &&
                  !analysis.forcedOperators.length
                }
                onClick={() => {
                  const item =
                    analysis.forcedNumbers[0] ?? analysis.forcedOperators[0];
                  setState({ ...state, selected: item.index });
                  setMessage("すべての成立候補で共通する確定マスです。");
                }}
              >
                確定候補
              </button>
              <button
                className="button"
                onClick={() => setState(revealHint(puzzle, state))}
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
            </div>
            {state.selected !== null && !active && (
              <div className="actions">
                {selectedExpressions.map((e) => (
                  <button
                    className="button secondary"
                    key={e.id}
                    onClick={() => {
                      setState(selectHypothesisExpression(state, e.id));
                      setLimit(20);
                    }}
                  >
                    {expressionLabel(e.id)}から考える
                  </button>
                ))}
              </div>
            )}
            {active && (
              <>
                <h3>
                  {expressionLabel(active.id)}：成立候補{" "}
                  {analysis.domains.get(active.id)?.length ?? 0}通り
                </h3>
                <div className="sequence-list">
                  {analysis.domains
                    .get(active.id)
                    ?.slice(0, limit)
                    .map((assignment, index) => (
                      <button
                        className="sequence-card"
                        key={index}
                        onClick={() =>
                          setState(applyAssignment(state, assignment))
                        }
                      >
                        {active.cells
                          .map((cell, i) =>
                            i % 2 === 0
                              ? assignment.numbers.get(cell)
                              : symbol(assignment.operators.get(cell)!),
                          )
                          .join(" ")}
                      </button>
                    ))}
                </div>
                {(analysis.domains.get(active.id)?.length ?? 0) > limit && (
                  <button
                    className="button secondary"
                    onClick={() => setLimit(limit + 20)}
                  >
                    さらに表示
                  </button>
                )}
              </>
            )}
            {(analysis.forcedNumbers.length > 0 ||
              analysis.forcedOperators.length > 0) && (
              <button
                className="button secondary"
                onClick={() => setState(applyForced(state, analysis))}
              >
                伝播した確定候補をすべて仮入力
              </button>
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
