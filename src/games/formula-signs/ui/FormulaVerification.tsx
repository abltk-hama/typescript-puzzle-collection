import { useMemo, useState } from "react";
import {
  analyzeFormula,
  applyAssignment,
  commitHypothesis,
  startHypothesis,
  workingNumbers,
  workingOperators,
  type ExpressionAssignment,
  type FormulaPuzzle,
  type FormulaState,
  type Operator,
} from "../domain/formulaSigns";
import { calculationBasis } from "./verificationBasis";
type Mode = Operator;
type Rational = { numerator: number; denominator: number };
type Assumption = {
  kind: "number" | "operator";
  index: number;
  value: number | Operator;
};
type Path = {
  id: string;
  label: string;
  result: Rational;
  assumptions: Assumption[];
};
type Snapshot = {
  selected: number[];
  path: Path | null;
  state: FormulaState;
  expressionId: string | null;
};
const modes: Mode[] = ["+", "-", "*"],
  modeLabel = (mode: Mode) => (mode === "*" ? "×検算" : `${mode}検算`),
  gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a)),
  normalize = (n: number, d = 1): Rational => {
    const sign = d < 0 ? -1 : 1,
      divisor = gcd(n, d) || 1;
    return {
      numerator: (n / divisor) * sign,
      denominator: Math.abs(d / divisor),
    };
  },
  calculate = (value: Rational, number: number, mode: Mode) =>
    mode === "+"
      ? normalize(
          value.numerator - number * value.denominator,
          value.denominator,
        )
      : mode === "-"
        ? normalize(
            value.numerator + number * value.denominator,
            value.denominator,
          )
        : normalize(value.numerator, value.denominator * number),
  format = (value: Rational) =>
    value.denominator === 1
      ? String(value.numerator)
      : `${value.numerator}/${value.denominator}`;
function assumptionsFor(
  expressionCells: number[],
  index: number,
  value: number,
  mode: Mode,
  isBlank: boolean,
) {
  const result: Assumption[] = [];
  if (isBlank) result.push({ kind: "number", index, value });
  const position = expressionCells.indexOf(index);
  if (position > 0)
    result.push({
      kind: "operator",
      index: expressionCells[position - 1],
      value: mode,
    });
  return result;
}
function compatible(
  assignment: ExpressionAssignment,
  assumptions: Assumption[],
) {
  return assumptions.every((item) =>
    item.kind === "number"
      ? assignment.numbers.get(item.index) === item.value
      : assignment.operators.get(item.index) === item.value,
  );
}
export function FormulaVerification({
  puzzle,
  state,
  setState,
  setMessage,
  onExpressionChange,
}: {
  puzzle: FormulaPuzzle;
  state: FormulaState;
  setState: (state: FormulaState) => void;
  setMessage: (message: string) => void;
  onExpressionChange: (id: string | null) => void;
}) {
  const [expressionId, setExpressionId] = useState<string | null>(null),
    [selected, setSelected] = useState<number[]>([]),
    [path, setPath] = useState<Path | null>(null),
    [history, setHistory] = useState<Snapshot[]>([]),
    [baseState, setBaseState] = useState<FormulaState | null>(null),
    [basisMode, setBasisMode] = useState<"initial" | "current">("current"),
    expression = puzzle.expressions.find((item) => item.id === expressionId),
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
    initialAnalysis = useMemo(
      () =>
        analyzeFormula(
          puzzle,
          puzzle.numberGivens,
          puzzle.operatorGivens,
          state.numberNotes,
          state.operatorNotes,
        ),
      [puzzle, state.numberNotes, state.operatorNotes],
    ),
    initialBasis = expression
      ? calculationBasis(
          expression.cells,
          expression.target,
          puzzle.numberGivens,
          puzzle.operatorGivens,
        )
      : null,
    currentBasis = expression
      ? calculationBasis(
          expression.cells,
          expression.target,
          numbers,
          operators,
        )
      : null,
    basis = basisMode === "initial" ? initialBasis : currentBasis,
    basisNumbers = basisMode === "initial" ? puzzle.numberGivens : numbers,
    domain = expression
      ? ((basisMode === "initial" ? initialAnalysis : analysis).domains.get(
          expression.id,
        ) ?? [])
      : [];
  function candidates(index: number) {
    if (basisNumbers[index]) return [basisNumbers[index]];
    return state.numberNotes[index];
  }
  function remember() {
    setHistory([
      ...history,
      { selected: [...selected], path, state, expressionId },
    ]);
  }
  function selectNumber(index: number) {
    remember();
    setPath(null);
    setBasisMode("current");
    setSelected(
      selected.includes(index)
        ? selected.filter((item) => item !== index)
        : selected.length < 2
          ? [...selected, index]
          : [selected[1], index],
    );
  }
  function choose(next: Path) {
    remember();
    setPath(next);
  }
  function enter(id: string) {
    if (expressionId) remember();
    else {
      setBaseState(state);
      if (!state.hypothesis) setState(startHypothesis(state));
      setHistory([]);
    }
    setExpressionId(id);
    setSelected([]);
    setPath(null);
    onExpressionChange(id);
  }
  function reset() {
    setSelected([]);
    setPath(null);
    setHistory([]);
  }
  function finish() {
    setExpressionId(null);
    setSelected([]);
    setPath(null);
    setHistory([]);
    setBaseState(null);
    onExpressionChange(null);
  }
  function close() {
    if (baseState) setState(baseState);
    finish();
    setMessage("検算セッションを破棄して終了しました。");
  }
  function undo() {
    const items = [...history],
      previous = items.pop();
    if (!previous) return;
    setSelected(previous.selected);
    setPath(previous.path);
    setState(previous.state);
    setExpressionId(previous.expressionId);
    onExpressionChange(previous.expressionId);
    setHistory(items);
  }
  const first: Path[] =
      expression && basis
        ? selected.flatMap((index) =>
            candidates(index).flatMap((value) =>
              modes.map((mode) => ({
                id: `${index}:${value}:${mode}`,
                label: `${modeLabel(mode)} ${value}`,
                result: calculate(normalize(basis.target), value, mode),
                assumptions: assumptionsFor(
                  basis.cells,
                  index,
                  value,
                  mode,
                  !basisNumbers[index],
                ),
              })),
            ),
          )
        : [],
    remaining =
      expression && basis
        ? basis.cells
            .filter((_, offset) => offset % 2 === 0)
            .filter((index) => !selected.includes(index))
        : [],
    second: Path[] = expression
      ? first.flatMap((base) =>
          remaining.flatMap((index) =>
            candidates(index).flatMap((value) =>
              modes.map((mode) => ({
                id: `${base.id}|${index}:${value}:${mode}`,
                label: `${base.label} → 残り${value} ${modeLabel(mode)}`,
                result: calculate(base.result, value, mode),
                assumptions: [
                  ...base.assumptions,
                  ...assumptionsFor(
                    basis!.cells,
                    index,
                    value,
                    mode,
                    !basisNumbers[index],
                  ),
                ],
              })),
            ),
          ),
        )
      : [];
  function possible(item: Path) {
    return domain.some((assignment) =>
      compatible(assignment, item.assumptions),
    );
  }
  function provisionalApply() {
    if (!path || !path.id.includes("|") || !possible(path)) return;
    remember();
    const assignment: ExpressionAssignment = {
      numbers: new Map(),
      operators: new Map(),
    };
    path.assumptions.forEach((item) =>
      item.kind === "number"
        ? assignment.numbers.set(item.index, item.value as number)
        : assignment.operators.set(item.index, item.value as Operator),
    );
    const hypothesisState = state.hypothesis ? state : startHypothesis(state),
      next = applyAssignment(hypothesisState, assignment),
      nextNumbers = workingNumbers(next),
      nextOperators = workingOperators(next),
      failed = path.assumptions.some((item) =>
        item.kind === "number"
          ? nextNumbers[item.index] !== item.value
          : nextOperators[item.index] !== item.value,
      );
    if (failed) {
      setMessage(
        "仮適用に失敗しました。対象マスの固定値または既存の仮入力を確認してください。",
      );
      return;
    }
    setState(next);
    setPath(null);
    setMessage(
      "第2検算表から選んだ演算子を仮適用しました。交差する行・列を確認できます。",
    );
  }
  function clearProvisional() {
    if (!baseState) return;
    remember();
    setState(baseState.hypothesis ? baseState : startHypothesis(baseState));
    setPath(null);
    setMessage("検算セッション内の仮適用をすべて取り消しました。");
  }
  function applyAll() {
    if (!state.hypothesis || analysis.contradictionExpressionId) return;
    setState(commitHypothesis(state));
    finish();
    setMessage("検算セッションの仮入力をすべて盤面へ適用しました。");
  }
  if (!expression)
    return (
      <section className="verification-panel">
        <h2>検算ワークスペース</h2>
        <p>行または列を選び、目標値から逆算する表を開きます。</p>
        <div className="actions">
          {puzzle.expressions.map((item) => (
            <button
              className="button secondary"
              key={item.id}
              onClick={() => enter(item.id)}
            >
              {item.direction === "horizontal" ? "横" : "縦"} 目標 {item.target}
            </button>
          ))}
        </div>
      </section>
    );
  const numberCells = basis!.cells.filter((_, offset) => offset % 2 === 0);
  return (
    <section className="verification-panel">
      <header>
        <div>
          <h2>検算ワークスペース</h2>
          <strong>
            {expression.direction === "horizontal" ? "横" : "縦"}の式 / 目標{" "}
            {expression.target}
          </strong>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            disabled={!history.length}
            onClick={undo}
          >
            1手戻る
          </button>
          <button className="button secondary" onClick={reset}>
            入口に戻る
          </button>
          <button className="button secondary" onClick={close}>
            検算を終了
          </button>
        </div>
      </header>
      <div className="verification-expression-switch" aria-label="検算する行列">
        {puzzle.expressions.map((item) => (
          <button
            className={`button secondary ${item.id === expression.id ? "active" : ""} ${analysis.domains.get(item.id)?.length === 0 ? "contradiction" : ""}`}
            key={item.id}
            onClick={() => enter(item.id)}
          >
            {item.direction === "horizontal" ? "横" : "縦"} {item.target}
          </button>
        ))}
      </div>
      {analysis.contradictionExpressionId ? (
        <p role="alert">
          仮適用により成立できない行・列があります。別の行・列へ切り替えて確認するか、1手戻ってください。
        </p>
      ) : (
        <p className="verification-valid">
          現在の仮適用では、すべての行・列に成立候補が残っています。
        </p>
      )}
      <div className="verification-bases">
        <button
          className={basisMode === "initial" ? "active" : ""}
          onClick={() => {
            setBasisMode("initial");
            setSelected([]);
            setPath(null);
          }}
        >
          <strong>初期条件込み検算</strong>
          <span>検算基準：{initialBasis?.target}</span>
          <small>
            {initialBasis?.calculations.length
              ? initialBasis.calculations.join(" / ")
              : "安全に事前計算できる固定末尾項はありません"}
          </small>
        </button>
        <button
          className={basisMode === "current" ? "active" : ""}
          onClick={() => {
            setBasisMode("current");
            setSelected([]);
            setPath(null);
          }}
        >
          <strong>現在仮説込み検算</strong>
          <span>検算基準：{currentBasis?.target}</span>
          <small>
            {currentBasis?.calculations.length
              ? currentBasis.calculations.join(" / ")
              : "初期条件から追加で事前計算できる末尾項はありません"}
          </small>
        </button>
      </div>
      {basisMode === "initial" && (
        <p>
          初期条件表は比較専用です。仮適用する場合は「現在仮説込み検算」へ切り替えてください。
        </p>
      )}
      <p>
        数字を1～2個選択してください。挑戦の空欄は、盤面に残した候補メモだけを使用します。
      </p>
      <div className="verification-number-select">
        {numberCells.map((index, position) => (
          <button
            key={index}
            disabled={!basisNumbers[index] && !state.numberNotes[index].length}
            className={`button secondary ${selected.includes(index) ? "active" : ""}`}
            onClick={() => selectNumber(index)}
          >
            {position === 0 ? "起点 " : ""}
            {basisNumbers[index] ||
              `候補 ${state.numberNotes[index].join("・") || "なし"}`}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <>
          <h3>第1検算表</h3>
          <div className="verification-table-wrap">
            <table className="verification-table">
              <thead>
                <tr>
                  <th>検算</th>
                  {selected.flatMap((index) =>
                    candidates(index).map((value) => (
                      <th key={`${index}:${value}`}>
                        {basisNumbers[index]
                          ? `数字 ${value}`
                          : `候補 ${value}`}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {modes.map((mode) => (
                  <tr key={mode}>
                    <th>{modeLabel(mode)}</th>
                    {selected.flatMap((index) =>
                      candidates(index).map((value) => {
                        const item = first.find(
                          (entry) => entry.id === `${index}:${value}:${mode}`,
                        )!;
                        return (
                          <td key={item.id}>
                            <button
                              className={path?.id === item.id ? "active" : ""}
                              onClick={() => choose(item)}
                            >
                              {format(item.result)}{" "}
                              <small>
                                {possible(item) ? "成立可能" : "成立不能"}
                              </small>
                            </button>
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>残りの数字による第2検算表</h3>
          <div className="verification-table-wrap">
            <table className="verification-table second">
              <thead>
                <tr>
                  <th>第1結果</th>
                  <th>残りの数字</th>
                  {modes.map((mode) => (
                    <th key={mode}>{modeLabel(mode)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {first.flatMap((base) =>
                  remaining.flatMap((index) =>
                    candidates(index).length
                      ? candidates(index).map((value) => (
                          <tr key={`${base.id}:${index}:${value}`}>
                            <th>{format(base.result)}</th>
                            <th>
                              {basisNumbers[index] ? value : `候補 ${value}`}
                            </th>
                            {modes.map((mode) => {
                              const item = second.find(
                                (entry) =>
                                  entry.id ===
                                  `${base.id}|${index}:${value}:${mode}`,
                              )!;
                              return (
                                <td key={mode}>
                                  <button
                                    className={
                                      path?.id === item.id ? "active" : ""
                                    }
                                    onClick={() => choose(item)}
                                  >
                                    {format(item.result)}{" "}
                                    <small>
                                      {possible(item)
                                        ? "成立可能"
                                        : "残りの数字では算出不能"}
                                    </small>
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      : [
                          <tr key={`${base.id}:${index}`}>
                            <th>{format(base.result)}</th>
                            <th>候補メモなし</th>
                            <td colSpan={3}>検算できません</td>
                          </tr>,
                        ],
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {path && (
        <div className="verification-apply">
          <strong>
            選択中：{path.label} → {format(path.result)}
          </strong>
          <span>
            仮適用予定：
            {path.assumptions
              .map((item) => {
                const row = Math.floor(item.index / puzzle.width) + 1,
                  column = (item.index % puzzle.width) + 1;
                return `${row}行${column}列=${item.kind === "operator" ? (item.value === "*" ? "×" : item.value) : item.value}`;
              })
              .join("、") || "盤面へ反映できる仮定なし"}
          </span>
          <button
            className="button"
            disabled={
              basisMode === "initial" ||
              !path.id.includes("|") ||
              !possible(path) ||
              !path.assumptions.length
            }
            onClick={provisionalApply}
          >
            第2検算結果を仮適用
          </button>
          {!path.assumptions.length && (
            <small>起点数字だけの検算結果は盤面へ適用できません。</small>
          )}
        </div>
      )}
      <div className="verification-session-actions actions">
        <button className="button secondary" onClick={clearProvisional}>
          仮適用をすべて取り消す
        </button>
        <button
          className="button"
          disabled={Boolean(analysis.contradictionExpressionId)}
          onClick={applyAll}
        >
          すべて適用
        </button>
      </div>
    </section>
  );
}
