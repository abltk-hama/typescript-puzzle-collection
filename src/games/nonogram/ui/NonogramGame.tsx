import { useEffect, useMemo, useRef, useState } from "react";
import {
  GameFooter,
  MessagePanel,
} from "../../../common/components/GameChrome";
import type { NonogramPuzzle, NonogramState } from "../domain/nonogram";
import {
  applyStroke,
  hasProgress,
  initialNonogram,
  isComplete,
  lineComplete,
  revealCell,
  undoStroke,
} from "../domain/nonogram";
import {
  deleteNonogramSession,
  loadNonogramSession,
  saveNonogramSession,
} from "../data/sessions";
type Phase = "loading" | "ask" | "play";
interface Drag {
  origin: number;
  indices: number[];
  axis: "row" | "column" | null;
  target: 1 | 2;
}
export function NonogramGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: NonogramPuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<NonogramState>(() =>
      initialNonogram(puzzle),
    ),
    [phase, setPhase] = useState<Phase>("loading"),
    [message, setMessage] = useState("ゲームを開始しました。"),
    saved = useRef<NonogramState | undefined>(undefined),
    drag = useRef<Drag | null>(null),
    stateRef = useRef(state),
    complete = isComplete(puzzle, state),
    completedRows = useMemo(
      () =>
        puzzle.rowClues.map((_, i) => lineComplete(puzzle, state, "row", i)),
      [puzzle, state],
    ),
    completedColumns = useMemo(
      () =>
        puzzle.columnClues.map((_, i) =>
          lineComplete(puzzle, state, "column", i),
        ),
      [puzzle, state],
    );
  stateRef.current = state;
  useEffect(() => {
    loadNonogramSession(puzzle)
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
    if (complete || !hasProgress(state)) deleteNonogramSession(puzzle.id);
    else saveNonogramSession(puzzle, state);
  }, [state, phase, complete, puzzle]);
  useEffect(() => {
    function finish() {
      const current = drag.current;
      if (!current) return;
      drag.current = null;
      const next = applyStroke(
        puzzle,
        stateRef.current,
        current.indices,
        current.target,
      );
      setState(next);
      if (next !== stateRef.current)
        setMessage(
          current.target === 1
            ? "マスを塗りました。"
            : "空きマスに×を付けました。",
        );
    }
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [puzzle]);
  function begin(index: number, event: React.PointerEvent) {
    if (complete || state.hinted.includes(index)) return;
    event.preventDefault();
    drag.current = {
      origin: index,
      indices: [index],
      axis: null,
      target: event.button === 2 ? 2 : state.inputMode,
    };
    setState((current) => ({ ...current, selected: index }));
  }
  function enter(index: number) {
    const current = drag.current;
    if (!current || state.hinted.includes(index)) return;
    const originRow = Math.floor(current.origin / puzzle.width),
      originColumn = current.origin % puzzle.width,
      row = Math.floor(index / puzzle.width),
      column = index % puzzle.width;
    if (current.axis === null) {
      if (row === originRow && column !== originColumn) current.axis = "row";
      else if (column === originColumn && row !== originRow)
        current.axis = "column";
      else return;
    }
    if (
      (current.axis === "row" && row !== originRow) ||
      (current.axis === "column" && column !== originColumn)
    )
      return;
    const start = current.axis === "row" ? originColumn : originRow,
      end = current.axis === "row" ? column : row,
      low = Math.min(start, end),
      high = Math.max(start, end);
    current.indices = Array.from({ length: high - low + 1 }, (_, offset) =>
      current.axis === "row"
        ? originRow * puzzle.width + low + offset
        : (low + offset) * puzzle.width + originColumn,
    );
  }
  function hint(random = false) {
    const unresolved = state.cells
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell, index }) =>
          !state.hinted.includes(index) && cell !== (puzzle.solution[index] ? 1 : 2),
        ),
      preferred = random
        ? unresolved[Math.floor(Math.random() * unresolved.length)]?.index
        : (state.selected ?? undefined),
      next = revealCell(puzzle, state, preferred);
    setState(next);
    setMessage(
      next === state
        ? random
          ? "開示できる未解決マスはありません。"
          : state.selected === null
            ? "ヒントを使うマスを選択してください。"
            : "そのマスはすでに確定しています。"
        : `${Math.floor(next.selected! / puzzle.width) + 1}行${(next.selected! % puzzle.width) + 1}列を開示しました。`,
    );
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
                setState(saved.current as NonogramState);
                setMessage("保存済みの進捗から再開しました。");
                setPhase("play");
              }}
            >
              続きから
            </button>
            <button
              className="button secondary"
              onClick={() => {
                deleteNonogramSession(puzzle.id);
                setState(initialNonogram(puzzle));
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
  const cellSize = puzzle.width === 5 ? "3.7rem" : "2.7rem";
  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>ノノグラム</h1>
          <strong>
            {puzzle.title} / {puzzle.width}×{puzzle.height}
          </strong>
        </div>
        <div className="stats">
          <span>入力: {state.inputMode === 1 ? "塗り" : "×"}</span>
          <span>ヒント: {state.hintCount}回</span>
        </div>
        <div className="nonogram-modes">
          <button
            className={`button ${state.inputMode === 1 ? "active-mode" : "secondary"}`}
            onClick={() =>
              setState((current) => ({ ...current, inputMode: 1 }))
            }
          >
            ■ 塗り
          </button>
          <button
            className={`button ${state.inputMode === 2 ? "active-mode" : "secondary"}`}
            onClick={() =>
              setState((current) => ({ ...current, inputMode: 2 }))
            }
          >
            × 空き
          </button>
        </div>
        <div
          className="nonogram-layout"
          style={{ "--nonogram-size": cellSize } as React.CSSProperties}
        >
          <div />
          <div
            className="nonogram-column-clues"
            style={{
              gridTemplateColumns: `repeat(${puzzle.width},var(--nonogram-size))`,
            }}
          >
            {puzzle.columnClues.map((clues, index) => (
              <div
                key={index}
                className={completedColumns[index] ? "complete" : ""}
              >
                {clues.length ? (
                  clues.map((v, i) => <span key={i}>{v}</span>)
                ) : (
                  <span>0</span>
                )}
              </div>
            ))}
          </div>
          <div className="nonogram-row-clues">
            {puzzle.rowClues.map((clues, index) => (
              <div
                key={index}
                className={completedRows[index] ? "complete" : ""}
              >
                {clues.length ? clues.join(" ") : "0"}
              </div>
            ))}
          </div>
          <div
            className="nonogram-board"
            role="grid"
            aria-label="ノノグラム盤面"
            style={{
              gridTemplateColumns: `repeat(${puzzle.width},var(--nonogram-size))`,
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {state.cells.map((cell, index) => (
              <button
                key={index}
                role="gridcell"
                aria-label={`${Math.floor(index / puzzle.width) + 1}行${(index % puzzle.width) + 1}列 ${cell === 1 ? "塗り" : cell === 2 ? "空き" : "未確定"}`}
                className={`${cell === 1 ? "filled" : cell === 2 ? "marked" : ""} ${state.hinted.includes(index) ? "hinted" : ""} ${state.selected === index ? "selected" : ""}`}
                onPointerDown={(event) => begin(index, event)}
                onPointerEnter={() => enter(index)}
              >
                {cell === 2 ? "×" : ""}
              </button>
            ))}
          </div>
        </div>
        <p className="operation-help">
          左ドラッグ: 選択中の入力　／　右クリック・右ドラッグ:
          ×　／　水平・垂直の1ストロークを一手として記録
        </p>
        <div className="actions">
          <button
            className="button hint"
            disabled={complete}
            onClick={() => hint(false)}
          >
            選択マスを開示
          </button>
          <button
            className="button hint"
            disabled={complete}
            onClick={() => hint(true)}
          >
            ランダムに1マス開示
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
            <>
              <button
                className="button secondary"
                disabled={!state.history.length || complete}
                onClick={() => {
                  setState(undoStroke(puzzle, state));
                  setMessage("一手戻しました。");
                }}
              >
                一手戻す
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  if (confirm("盤面を初期状態に戻しますか？")) {
                    setState(initialNonogram(puzzle));
                    deleteNonogramSession(puzzle.id);
                    setMessage("盤面を初期状態に戻しました。");
                  }
                }}
              >
                リセット
              </button>
            </>
          }
        />
      </section>
    </main>
  );
}
