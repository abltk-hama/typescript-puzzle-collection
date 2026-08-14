import { useMemo, useState } from "react";
import {
  analyzeFormula,
  applyAssignment,
  expressionsForCell,
  startHypothesis,
  workingNumbers,
  workingOperators,
  type ExpressionAssignment,
  type FormulaPuzzle,
  type FormulaState,
  type Operator,
} from "../domain/formulaSigns";

const symbol = (operator: Operator) => (operator === "*" ? "×" : operator);

function assignmentFormula(
  puzzle: FormulaPuzzle,
  expressionId: string,
  assignment: ExpressionAssignment,
) {
  const expression = puzzle.expressions.find((item) => item.id === expressionId)!;
  return expression.cells
    .map((index, offset) =>
      offset % 2 === 0
        ? assignment.numbers.get(index)
        : symbol(assignment.operators.get(index)!),
    )
    .join(" ");
}

function addsValue(state: FormulaState, assignment: ExpressionAssignment) {
  const numbers = workingNumbers(state),
    operators = workingOperators(state);
  return (
    [...assignment.numbers].some(([index, value]) => numbers[index] !== value) ||
    [...assignment.operators].some(
      ([index, value]) => operators[index] !== value,
    )
  );
}

export function FormulaChainExplorer({
  puzzle,
  state,
  setState,
  setMessage,
  autoAdvance,
}: {
  puzzle: FormulaPuzzle;
  state: FormulaState;
  setState: (state: FormulaState) => void;
  setMessage: (message: string) => void;
  autoAdvance: boolean;
}) {
  const [expressionId, setExpressionId] = useState<string | null>(null),
    [choice, setChoice] = useState<ExpressionAssignment | null>(null),
    numbers = workingNumbers(state),
    operators = workingOperators(state),
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
    selectedExpressions =
      state.selected === null ? [] : expressionsForCell(puzzle, state.selected),
    expression = puzzle.expressions.find((item) => item.id === expressionId),
    domain = expressionId ? analysis.domains.get(expressionId) ?? [] : [];

  function chooseExpression(id: string) {
    setExpressionId(id);
    setChoice(null);
  }

  function applyChoice() {
    if (!expression || !choice) return;
    let next = state.hypothesis ? state : startHypothesis(state),
      current = expression,
      applied = 0;
    next = applyAssignment(next, choice);
    applied++;
    if (autoAdvance) {
      const visited = new Set([current.id]);
      while (applied < puzzle.expressions.length) {
        const nextAnalysis = analyzeFormula(
            puzzle,
            workingNumbers(next),
            workingOperators(next),
            next.numberNotes,
            next.operatorNotes,
          ),
          crossing = puzzle.expressions.find(
            (candidate) =>
              !visited.has(candidate.id) &&
              candidate.cells.some((index) => current.cells.includes(index)) &&
              nextAnalysis.domains.get(candidate.id)?.length === 1 &&
              addsValue(next, nextAnalysis.domains.get(candidate.id)![0]),
          );
        if (!crossing) break;
        const forced = nextAnalysis.domains.get(crossing.id)![0];
        next = applyAssignment(next, forced);
        visited.add(crossing.id);
        current = crossing;
        applied++;
      }
    }
    setState(next);
    setExpressionId(current.id);
    setChoice(null);
    setMessage(
      applied > 1
        ? `成立式を仮適用し、一意な交差式を${applied - 1}段連鎖しました。`
        : "確認した成立式を仮適用しました。交差する行・列へ進めます。",
    );
  }

  const nextExpressions = expression
    ? puzzle.expressions.filter(
        (candidate) =>
          candidate.id !== expression.id &&
          candidate.cells.some((index) => expression.cells.includes(index)),
      )
    : [];
  return (
    <section className="chain-explorer">
      <header>
        <div>
          <h2>整理レベル2：成立式の連鎖探索</h2>
          <p>起点の行・列を選び、目標と一致する式だけを電卓で確認します。</p>
        </div>
        <span className="chain-auto-state">
          一意候補の自動連鎖：{autoAdvance ? "ON" : "OFF"}
        </span>
      </header>
      {!expression && (
        <div className="actions">
          {selectedExpressions.length ? (
            selectedExpressions.map((item) => (
              <button
                className="button secondary"
                key={item.id}
                onClick={() => chooseExpression(item.id)}
              >
                {item.direction === "horizontal" ? "行" : "列"}を起点にする（目標 {item.target}）
              </button>
            ))
          ) : (
            <p>盤面の数字マスまたは数字空欄を選択してください。</p>
          )}
        </div>
      )}
      {expression && (
        <>
          <div className="chain-expression-nav actions">
            <button
              className="button secondary"
              onClick={() => {
                setExpressionId(null);
                setChoice(null);
              }}
            >
              起点を選び直す
            </button>
            {nextExpressions.map((item) => (
              <button
                className="button secondary"
                key={item.id}
                onClick={() => chooseExpression(item.id)}
              >
                交差する{item.direction === "horizontal" ? "行" : "列"}（目標 {item.target}）
              </button>
            ))}
          </div>
          <h3>
            {expression.direction === "horizontal" ? "行" : "列"}・目標 {expression.target}：成立候補 {domain.length}通り
          </h3>
          {!domain.length && <p role="alert">現在の確定値・仮説・候補メモでは成立しません。</p>}
          <div className="chain-candidates">
            {domain.slice(0, 100).map((assignment, index) => {
              const formula = assignmentFormula(puzzle, expression.id, assignment);
              return (
                <button
                  className={choice === assignment ? "active" : ""}
                  key={`${formula}:${index}`}
                  onClick={() => setChoice(assignment)}
                >
                  <strong>候補 {index + 1}</strong>
                  <span>{formula} = {expression.target}</span>
                </button>
              );
            })}
          </div>
          {domain.length > 100 && <p>先頭100件を表示しています。候補メモで数字を絞ると一覧を短くできます。</p>}
          <div className="formula-calculator" aria-live="polite">
            <strong>確認用電卓</strong>
            {choice ? (
              <>
                <output>{assignmentFormula(puzzle, expression.id, choice)} = {expression.target}</output>
                <small>×を先に計算し、表示された目標値になることを確認してください。</small>
                <button className="button" onClick={applyChoice}>確認して仮適用</button>
              </>
            ) : (
              <span>成立候補を選ぶと計算式が自動入力されます。</span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
