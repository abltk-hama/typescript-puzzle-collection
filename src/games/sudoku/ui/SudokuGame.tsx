import { useEffect, useMemo, useRef, useState } from "react";
import {
  GameFooter,
  MessagePanel,
} from "../../../common/components/GameChrome";
import type { SudokuPuzzle, SudokuState } from "../domain/sudoku";
import {
  clearCell,
  conflicts,
  enterNumber,
  initialSudoku,
  isComplete,
  isFixed,
  lightHint,
  peers,
  revealHint,
  selectCell,
  setMode,
} from "../domain/sudoku";
import {
  deleteSudokuSession,
  loadSudokuSession,
  saveSudokuSession,
} from "../data/sessions";
type Phase = "loading" | "ask" | "play";
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
    saved = useRef<SudokuState | undefined>(undefined),
    board = useRef<HTMLDivElement>(null),
    complete = isComplete(state),
    conflicting = useMemo(() => conflicts(state.values), [state.values]);
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
    const next = enterNumber(puzzle, state, value);
    setState(next);
    if (next !== state)
      setMessage(
        state.inputMode === "note"
          ? `候補 ${value} を切り替えました。`
          : `${value} を入力しました。`,
      );
  }
  function clear() {
    const next = clearCell(puzzle, state);
    setState(next);
    if (next !== state) setMessage("選択マスを消去しました。");
  }
  function keyDown(event: React.KeyboardEvent) {
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
            {Array.from({ length: 9 }, (_, i) => i + 1).map((value) => (
              <button
                key={value}
                aria-label={`数字 ${value}`}
                className={selectedValue === value ? "active" : ""}
                disabled={
                  complete || (state.inputMode === "value" && used.has(value))
                }
                onClick={() => applyNumber(value)}
              >
                {value}
              </button>
            ))}
            <button className="wide" onClick={clear}>
              消去
            </button>
            <button
              className={`wide ${state.inputMode === "note" ? "active" : ""}`}
              onClick={() =>
                setState(
                  setMode(state, state.inputMode === "note" ? "value" : "note"),
                )
              }
            >
              メモ {state.inputMode === "note" ? "ON" : "OFF"}
            </button>
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
                  className={`${fixed ? "fixed" : ""} ${state.hinted.includes(index) ? "hinted" : ""} ${state.selected === index ? "selected" : ""} ${related ? "related" : ""} ${same ? "same" : ""} ${conflicting.has(index) ? "conflict" : ""}`}
                  onClick={() => setState(selectCell(state, index))}
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
        <p className="operation-help">
          左クリック: マス選択　／　右クリック:
          メモ入力へ切替　／　数字キー・テンキー対応
        </p>
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
              const preferred = state.selected ?? undefined,
                next = revealHint(puzzle, state, preferred);
              setState(next);
              setMessage(
                next === state
                  ? "開示できるマスはありません。"
                  : `${Math.floor(next.selected! / 9) + 1}行${(next.selected! % 9) + 1}列を開示しました。`,
              );
            }}
          >
            1マス開示
          </button>
        </div>
        <MessagePanel
          message={
            complete
              ? `完成しました！（ヒント使用 ${state.hintCount}回）`
              : message
          }
        />
        <GameFooter
          onBack={onBack}
          onLauncher={onLauncher}
          left={
            <button
              className="button secondary"
              onClick={() => {
                if (confirm("盤面を初期状態に戻しますか？")) {
                  setState(initialSudoku(puzzle));
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
