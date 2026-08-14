import { useEffect, useMemo, useRef, useState } from "react";
import {
  GameFooter,
  MessagePanel,
} from "../../../common/components/GameChrome";
import type { SudokuPuzzle, SudokuState } from "../domain/sudoku";
import {
  clearCell,
  addCandidateNotes,
  cleanCandidateNotes,
  conflicts,
  enterNumber,
  applyLogicalHint,
  findLogicalHint,
  initialSudoku,
  isComplete,
  isFixed,
  lightHint,
  logicalHintScope,
  nearCompleteUnits,
  nearCompletionForCell,
  peers,
  revealHint,
  selectCell,
  setMode,
  type LogicalHint,
  createCheckpoint,
  restoreCheckpoint,
  acceptCheckpoint,
  cleanIncorrectEntries,
  reviewableUnits,
  unitReview,
} from "../domain/sudoku";
import {
  deleteSudokuSession,
  loadSudokuSession,
  saveSudokuSession,
} from "../data/sessions";
import {
  loadAssistSettings,
  saveAssistSettings,
} from "../../../common/storage/gameAssistSettings";
type Phase = "loading" | "ask" | "play";
interface SudokuAssistSettings {
  nearCompleteHighlight: boolean;
  rowColumnReview: boolean;
}
const sudokuAssistDefaults: SudokuAssistSettings = {
  nearCompleteHighlight: true,
  rowColumnReview: true,
};
export function SudokuGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: SudokuPuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<SudokuState>(() => initialSudoku(puzzle)),
    [phase, setPhase] = useState<Phase>("loading"),
    [message, setMessage] = useState("ゲームを開始しました。"),
    [focusMode, setFocusMode] = useState(false),
    [focusedDigit, setFocusedDigit] = useState<number | null>(null),
    [logicalHint, setLogicalHint] = useState<LogicalHint | null>(null),
    [reviewMode, setReviewMode] = useState<"row" | "column" | null>(null),
    [reviewIndex, setReviewIndex] = useState(0),
    [assistSettings, setAssistSettings] = useState(() =>
      loadAssistSettings("sudoku", sudokuAssistDefaults),
    ),
    [settingsOpen, setSettingsOpen] = useState(false),
    saved = useRef<SudokuState | undefined>(undefined),
    board = useRef<HTMLDivElement>(null),
    complete = isComplete(state),
    conflicting = useMemo(() => conflicts(state.values), [state.values]),
    digitCounts = useMemo(
      () =>
        Array.from(
          { length: 9 },
          (_, index) =>
            state.values.filter((value) => value === index + 1).length,
        ),
      [state.values],
    ),
    focusConstraints = useMemo(
      () =>
        new Set(
          focusedDigit === null
            ? []
            : state.values.flatMap((value, index) =>
                value === focusedDigit ? peers(index) : [],
              ),
        ),
      [focusedDigit, state.values],
    ),
    hintScope = useMemo(
      () => new Set(logicalHint ? logicalHintScope(logicalHint) : []),
      [logicalHint],
    ),
    activeReview = useMemo(
      () =>
        reviewMode ? unitReview(state.values, reviewMode, reviewIndex) : null,
      [reviewMode, reviewIndex, state.values],
    ),
    reviewableRows = useMemo(
      () => reviewableUnits(state.values, "row"),
      [state.values],
    ),
    reviewableColumns = useMemo(
      () => reviewableUnits(state.values, "column"),
      [state.values],
    );
  const nearUnits = useMemo(
      () => nearCompleteUnits(state.values),
      [state.values],
    ),
    nearCells = useMemo(
      () => new Set(nearUnits.flatMap((unit) => unit.cells)),
      [nearUnits],
    ),
    nearEmptyCells = useMemo(
      () => new Set(nearUnits.map((unit) => unit.emptyIndex)),
      [nearUnits],
    ),
    contradictoryEmptyCells = useMemo(
      () =>
        new Set(
          nearUnits
            .filter((unit) => !unit.valid)
            .map((unit) => unit.emptyIndex),
        ),
      [nearUnits],
    ),
    removableNotes = useMemo(() => cleanCandidateNotes(state).removed, [state]);
  useEffect(() => {
    loadSudokuSession(puzzle)
      .then((found) => {
        saved.current = found;
        setPhase(found ? "ask" : "play");
      })
      .catch(() => {
        setMessage("保存データを読み込めないため、最初から開始します。");
        setPhase("play");
      });
  }, [puzzle]);
  useEffect(() => {
    if (phase !== "play") return;
    if (complete) deleteSudokuSession(puzzle.id);
    else if (
      state.values.some((v, i) => v !== puzzle.givens[i]) ||
      state.notes.some((n) => n.length) ||
      state.hintCount
    )
      saveSudokuSession(puzzle, state);
  }, [state, phase, complete, puzzle]);
  useEffect(() => {
    if (phase === "play") board.current?.focus();
  }, [phase]);
  useEffect(
    () => saveAssistSettings("sudoku", assistSettings),
    [assistSettings],
  );
  const selectedValue =
      state.selected === null ? 0 : state.values[state.selected],
    used =
      state.selected === null
        ? new Set<number>()
        : new Set(
            peers(state.selected)
              .map((i) => state.values[i])
              .filter(Boolean),
          );
  function applyNumber(value: number) {
    if (reviewMode) {
      setMessage("行・列確認中はキーパッドを参照表示として使用します。");
      return;
    }
    const next = enterNumber(puzzle, state, value);
    setState(next);
    if (next !== state) setLogicalHint(null);
    if (next !== state)
      setMessage(
        state.inputMode === "note"
          ? `候補 ${value} を切り替えました。`
          : `${value} を入力しました。`,
      );
  }
  function clear() {
    if (reviewMode) {
      setMessage("行・列確認中は盤面を変更できません。");
      return;
    }
    const next = clearCell(puzzle, state);
    setState(next);
    if (next !== state) setLogicalHint(null);
    if (next !== state) setMessage("選択マスを消去しました。");
  }
  function selectBoardCell(index: number, value: number) {
    if (reviewMode) {
      const nextIndex =
        reviewMode === "row" ? Math.floor(index / 9) : index % 9;
      setReviewIndex(nextIndex);
      const review = unitReview(state.values, reviewMode, nextIndex);
      setMessage(
        `${reviewMode === "row" ? "行" : "列"}${nextIndex + 1}：空欄${review.emptyCount}、未使用 ${review.unused.join("・") || "なし"}${review.duplicates.length ? `（重複 ${review.duplicates.join("・")}）` : ""}`,
      );
      return;
    }
    setState(selectCell(state, index));
    if (focusMode && value) {
      setFocusedDigit(value);
      return;
    }
    if (value) return;
    const units = nearCompletionForCell(state.values, index);
    if (!units.length) return;
    const valid = units.filter((unit) => unit.valid),
      digits = [...new Set(valid.map((unit) => unit.missing[0]))];
    if (valid.length === units.length && digits.length === 1) {
      if (!focusMode) return;
      setFocusedDigit(digits[0]);
      const labels = valid
        .map((unit) =>
          unit.kind === "row"
            ? "行"
            : unit.kind === "column"
              ? "列"
              : "3×3ブロック",
        )
        .join("・");
      setMessage(
        `${labels}で不足している数字は${digits[0]}です。入力前に配置を確認してください。`,
      );
    } else {
      setFocusedDigit(null);
      const details = units
        .map(
          (unit) =>
            `${unit.kind === "row" ? "行" : unit.kind === "column" ? "列" : "3×3ブロック"}：${unit.missing.join("・") || "判定不能"}`,
        )
        .join("、");
      setMessage(
        `完成直前の単位で不足数字が一致しません（${details}）。入力内容を確認してください。`,
      );
    }
  }
  function keyDown(event: React.KeyboardEvent) {
    if (
      reviewMode &&
      (/^[1-9]$/.test(event.key) ||
        ["Delete", "Backspace", "0", "n"].includes(event.key))
    ) {
      event.preventDefault();
      return;
    }
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      applyNumber(Number(event.key));
    } else if (["Delete", "Backspace", "0"].includes(event.key)) {
      event.preventDefault();
      clear();
    } else if (event.key === "n") {
      setState(setMode(state, state.inputMode === "note" ? "value" : "note"));
    }
  }
  if (phase === "loading")
    return (
      <main className="shell">
        <section className="panel">
          <p>保存状態を確認しています…</p>
        </section>
      </main>
    );
  if (phase === "ask")
    return (
      <main className="shell">
        <section className="panel resume-dialog">
          <h1>保存済みの進捗</h1>
          <p>この問題には保存済みの進捗があります。</p>
          <div className="actions">
            <button
              className="button"
              onClick={() => {
                setState(saved.current as SudokuState);
                setMessage("保存済みの進捗から再開しました。");
                setPhase("play");
              }}
            >
              続きから
            </button>
            <button
              className="button secondary"
              onClick={() => {
                deleteSudokuSession(puzzle.id);
                setState(initialSudoku(puzzle));
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
          <h1>数独</h1>
          <strong>
            {puzzle.title} /{" "}
            {puzzle.difficulty === "generated" ? "生成問題" : puzzle.difficulty}
          </strong>
        </div>
        <div className="stats">
          <span>入力: {state.inputMode === "value" ? "数字" : "メモ"}</span>
          <span>ヒント: {state.hintCount}回</span>
        </div>
        <div className="sudoku-play">
          <div className="sudoku-keypad" aria-label="数字キーパッド">
            <button
              className={`wide sudoku-focus-toggle ${focusMode ? "active" : ""}`}
              onClick={() => {
                setFocusMode((enabled) => {
                  if (enabled) setFocusedDigit(null);
                  return !enabled;
                });
              }}
            >
              数字フォーカス{" "}
              {focusMode
                ? focusedDigit
                  ? `ON：${focusedDigit}`
                  : "ON"
                : "OFF"}
            </button>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((value) => (
              <button
                key={value}
                aria-label={`数字 ${value}`}
                className={`${selectedValue === value ? "active" : ""} ${activeReview?.unused.includes(value) ? "review-unused" : ""} ${activeReview?.duplicates.includes(value) ? "review-duplicate" : ""}`}
                disabled={
                  complete ||
                  (!reviewMode &&
                    state.inputMode === "value" &&
                    used.has(value))
                }
                onClick={() => applyNumber(value)}
              >
                <span>{value}</span>
                <small>{digitCounts[value - 1]}/9</small>
              </button>
            ))}
            <button
              className="wide"
              disabled={Boolean(reviewMode)}
              onClick={clear}
            >
              消去
            </button>
            <button
              className={`wide ${state.inputMode === "note" ? "active" : ""}`}
              disabled={Boolean(reviewMode)}
              onClick={() =>
                setState(
                  setMode(state, state.inputMode === "note" ? "value" : "note"),
                )
              }
            >
              メモ {state.inputMode === "note" ? "ON" : "OFF"}
            </button>
            {assistSettings.rowColumnReview && (
              <button
                className={`wide ${reviewMode ? "active" : ""}`}
                onClick={() => {
                  if (reviewMode) {
                    const review = activeReview!;
                    setReviewMode(null);
                    setMessage(
                      `直前の確認：${review.kind === "row" ? "行" : "列"}${review.unitIndex + 1}の未使用数字 ${review.unused.join("・") || "なし"}。3×3ブロックを確認してください。`,
                    );
                  } else {
                    const first = reviewableRows[0] ?? reviewableColumns[0];
                    if (!first) {
                      setMessage(
                        "空欄3マス以下の行・列はまだありません。橙色の印が出てから確認できます。",
                      );
                      return;
                    }
                    setReviewMode(first.kind);
                    setReviewIndex(first.unitIndex);
                    setMessage(
                      `${first.kind === "row" ? "行" : "列"}確認を開始しました。盤面を選ぶか、前後ボタンで巡回できます。`,
                    );
                  }
                }}
              >
                行・列確認 {reviewMode ? "ON" : "OFF"}
              </button>
            )}
          </div>
          <div
            className="sudoku-board"
            role="grid"
            aria-label="数独盤面"
            tabIndex={0}
            ref={board}
            onKeyDown={keyDown}
          >
            {state.values.map((value, index) => {
              const related =
                  state.selected !== null &&
                  (index === state.selected ||
                    peers(state.selected).includes(index)),
                same = selectedValue !== 0 && value === selectedValue,
                fixed = isFixed(puzzle, state, index);
              return (
                <button
                  key={index}
                  role="gridcell"
                  aria-label={`${Math.floor(index / 9) + 1}行${(index % 9) + 1}列${value ? ` ${value}` : ""}`}
                  className={`${fixed ? "fixed" : ""} ${state.hinted.includes(index) ? "hinted" : ""} ${state.selected === index ? "selected" : ""} ${related ? "related" : ""} ${same ? "same" : ""} ${conflicting.has(index) ? "conflict" : ""} ${assistSettings.rowColumnReview && index % 9 === 8 && reviewableRows.some((unit) => unit.unitIndex === Math.floor(index / 9)) ? "review-ready-row" : ""} ${assistSettings.rowColumnReview && Math.floor(index / 9) === 8 && reviewableColumns.some((unit) => unit.unitIndex === index % 9) ? "review-ready-column" : ""}`}
                  data-focus={
                    focusedDigit !== null && value === focusedDigit
                      ? "digit"
                      : focusedDigit !== null && focusConstraints.has(index)
                        ? "constraint"
                        : undefined
                  }
                  data-logical={
                    logicalHint?.index === index
                      ? "target"
                      : hintScope.has(index)
                        ? "scope"
                        : undefined
                  }
                  data-near={
                    !assistSettings.nearCompleteHighlight
                      ? undefined
                      : contradictoryEmptyCells.has(index)
                        ? "conflict"
                        : nearEmptyCells.has(index)
                          ? "empty"
                          : nearCells.has(index)
                            ? "unit"
                            : undefined
                  }
                  data-review={
                    activeReview?.cells.includes(index) ? "active" : undefined
                  }
                  onClick={() => selectBoardCell(index, value)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setState(setMode(selectCell(state, index), "note"));
                  }}
                >
                  {value || (
                    <span className="sudoku-notes">
                      {Array.from({ length: 9 }, (_, i) =>
                        state.notes[index].includes(i + 1) ? i + 1 : "",
                      ).map((n, i) => (
                        <i key={i}>{n}</i>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {reviewMode && activeReview && (
          <div className="sudoku-unit-review">
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => {
                  const next = reviewMode === "row" ? "column" : "row";
                  const available =
                    next === "row" ? reviewableRows : reviewableColumns;
                  if (!available.length) {
                    setMessage(
                      `空欄3マス以下の${next === "row" ? "行" : "列"}はありません。`,
                    );
                    return;
                  }
                  setReviewMode(next);
                  setReviewIndex(available[0].unitIndex);
                }}
              >
                {reviewMode === "row" ? "列確認へ" : "行確認へ"}
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  const available =
                    reviewMode === "row" ? reviewableRows : reviewableColumns;
                  const position = available.findIndex(
                    (unit) => unit.unitIndex === reviewIndex,
                  );
                  const next =
                    available[
                      (position - 1 + available.length) % available.length
                    ];
                  if (next) setReviewIndex(next.unitIndex);
                }}
              >
                前へ
              </button>
              <strong>
                {reviewMode === "row" ? "行" : "列"}
                {reviewIndex + 1}
              </strong>
              <button
                className="button secondary"
                onClick={() => {
                  const available =
                    reviewMode === "row" ? reviewableRows : reviewableColumns;
                  const position = available.findIndex(
                    (unit) => unit.unitIndex === reviewIndex,
                  );
                  const next = available[(position + 1) % available.length];
                  if (next) setReviewIndex(next.unitIndex);
                }}
              >
                次へ
              </button>
            </div>
            <p>
              空欄 {activeReview.emptyCount}／未使用{" "}
              {activeReview.unused.join("・") || "なし"}
              {activeReview.duplicates.length
                ? `／重複 ${activeReview.duplicates.join("・")}`
                : ""}
            </p>
            <p>
              キーパッドの明るい数字を確認し、3×3ブロックは盤面から判断してください。
            </p>
          </div>
        )}
        <MessagePanel
          message={
            complete
              ? `完成しました！（ヒント使用 ${state.hintCount}回）`
              : message
          }
        />
        <div className="checkpoint-controls">
          <div className="actions">
            <button
              className="button secondary"
              disabled={complete || state.checkpoints.length >= 3}
              onClick={() => {
                const next = createCheckpoint(state);
                setState(next);
                setLogicalHint(null);
                setMessage(
                  next === state
                    ? "チェックポイントは3段階までです。"
                    : `試行地点 ${next.checkpoints.length} を保存しました。`,
                );
              }}
            >
              ここから試す
            </button>
            {state.checkpoints.length > 0 && (
              <>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (
                      confirm(
                        `試行地点 ${state.checkpoints.length} へ戻り、その後の入力を破棄しますか？`,
                      )
                    ) {
                      setState(restoreCheckpoint(state));
                      setLogicalHint(null);
                      setFocusedDigit(null);
                      setMessage(
                        `試行地点 ${state.checkpoints.length} へ戻りました。ヒント回数は維持されます。`,
                      );
                    }
                  }}
                >
                  保存地点へ戻る
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setState(acceptCheckpoint(state));
                    setMessage(
                      `現在の盤面を採用しました。残りチェックポイント: ${state.checkpoints.length - 1}`,
                    );
                  }}
                >
                  この盤面を採用
                </button>
              </>
            )}
          </div>
          <p className="operation-help">
            仮説チェックポイント: {state.checkpoints.length}/3
            {state.checkpoints.length
              ? `（試行中 ${state.checkpoints.length}）`
              : ""}
          </p>
        </div>
        <div className="assist-settings">
          <button
            className="button secondary"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            補助設定{settingsOpen ? "を閉じる" : "を開く"}
          </button>
          {settingsOpen && (
            <div className="assist-settings-panel">
              <label>
                <input
                  type="checkbox"
                  checked={focusMode}
                  onChange={(event) => {
                    setFocusMode(event.target.checked);
                    if (!event.target.checked) setFocusedDigit(null);
                  }}
                />{" "}
                数字フォーカス
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={assistSettings.nearCompleteHighlight}
                  onChange={(event) =>
                    setAssistSettings({
                      ...assistSettings,
                      nearCompleteHighlight: event.target.checked,
                    })
                  }
                />{" "}
                完成直前単位を強調
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={assistSettings.rowColumnReview}
                  onChange={(event) => {
                    setAssistSettings({
                      ...assistSettings,
                      rowColumnReview: event.target.checked,
                    });
                    if (!event.target.checked) setReviewMode(null);
                  }}
                />{" "}
                行・列確認モード
              </label>
              <p>
                数字フォーカスON時のみ、完成直前マスの不足数字を自動フォーカスします。
              </p>
              <p>
                左クリック: マス選択／右クリック:
                メモ入力へ切替／数字キー・テンキー対応
              </p>
            </div>
          )}
        </div>
        <h2 className="action-heading">入力補助</h2>
        <div className="actions">
          <button
            className="button secondary"
            disabled={
              complete || state.selected === null || Boolean(selectedValue)
            }
            onClick={() => {
              const next = addCandidateNotes(state);
              setState(next);
              if (next !== state)
                setMessage(
                  `選択マスへ候補 ${next.notes[next.selected!].join("、") || "なし"} をメモしました。`,
                );
            }}
          >
            候補をメモ
          </button>
          <button
            className="button secondary"
            disabled={complete || removableNotes === 0}
            onClick={() => {
              const result = cleanCandidateNotes(state);
              setState(result.state);
              setMessage(`不要なメモを${result.removed}件削除しました。`);
            }}
          >
            メモを整理{removableNotes ? `（${removableNotes}）` : ""}
          </button>
        </div>
        <h2 className="action-heading">ヒント</h2>
        <div className="actions">
          <button
            className="button hint"
            disabled={complete || state.selected === null}
            onClick={() => {
              const next = lightHint(state);
              setState(next);
              setMessage(
                next.lightHint
                  ? `候補: ${next.lightHint.candidates.join("、") || "なし"}`
                  : "空きマスを選択してください。",
              );
            }}
          >
            選択マスの候補
          </button>
          <button
            className="button hint"
            disabled={complete}
            onClick={() => {
              if (conflicting.size) {
                setMessage(
                  "重複している数字があるため、確定候補を判定できません。",
                );
                return;
              }
              const hint = findLogicalHint(state.values);
              if (!hint) {
                setMessage(
                  "基本的な確定候補は見つかりませんでした。候補メモを進めるか、1マス開示を利用してください。",
                );
                return;
              }
              setState(applyLogicalHint(state, hint));
              setFocusMode(true);
              setFocusedDigit(hint.digit);
              setLogicalHint(hint);
              const place =
                hint.kind === "naked-single"
                  ? "このマスに入る候補"
                  : hint.kind === "hidden-single-row"
                    ? "この行で置ける場所"
                    : hint.kind === "hidden-single-column"
                      ? "この列で置ける場所"
                      : "この3×3ブロックで置ける場所";
              setMessage(
                hint.kind === "naked-single"
                  ? `${place}は${hint.digit}だけです。`
                  : `${place}がこのマスだけの数字は${hint.digit}です。`,
              );
            }}
          >
            確定候補を探す
          </button>
          <button
            className="button hint"
            disabled={complete}
            onClick={() => {
              const preferred = state.selected ?? undefined,
                next = revealHint(puzzle, state, preferred);
              setState(next);
              if (next !== state) setLogicalHint(null);
              setMessage(
                next === state
                  ? "開示できるマスはありません。"
                  : `${Math.floor(next.selected! / 9) + 1}行${(next.selected! % 9) + 1}列を開示しました。`,
              );
            }}
          >
            1マス開示
          </button>
          <button
            className="button hint danger-hint"
            disabled={complete}
            onClick={() => {
              if (
                !confirm(
                  "正解している数字だけを残し、誤った数字とそのマスのメモを消去します。仮説チェックポイントもすべて破棄します。",
                )
              )
                return;
              const result = cleanIncorrectEntries(puzzle, state);
              setState(result.state);
              setLogicalHint(null);
              setFocusedDigit(null);
              setMessage(
                result.removed
                  ? `誤った入力を${result.removed}マス消去しました。正しい入力は残しています。`
                  : "誤った入力はありませんでした。チェックポイントを破棄しました。",
              );
            }}
          >
            誤りを整理（奥の手）
          </button>
        </div>
        <GameFooter
          onBack={onBack}
          onLauncher={onLauncher}
          left={
            <button
              className="button secondary"
              onClick={() => {
                if (confirm("盤面を初期状態に戻しますか？")) {
                  setState(initialSudoku(puzzle));
                  setFocusMode(false);
                  setFocusedDigit(null);
                  setLogicalHint(null);
                  deleteSudokuSession(puzzle.id);
                  setMessage("盤面を初期状態に戻しました。");
                }
              }}
            >
              リセット
            </button>
          }
        />
      </section>
    </main>
  );
}
