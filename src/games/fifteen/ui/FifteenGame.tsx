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
  deleteFifteenSession,
  loadFifteenSession,
  saveFifteenSession,
} from "../data/sessions";
import {
  applyMoves,
  correctTileCount,
  emptyNavigationPaths,
  goalIndex,
  initialGame,
  isComplete,
  isCorrectPosition,
  move,
  moveEmpty,
  moveLine,
  movableTiles,
  nextHint,
  rectangleFromCorners,
  rectanglePerimeter,
  rotationMoves,
  undo,
  type EmptyNavigationPath,
  type FifteenPuzzle,
  type FifteenRectangle,
  type FifteenState,
  type RotationDirection,
} from "../domain/fifteen";

type ResumeChoice = "loading" | "ask" | "play";
type AssistMode = "normal" | "focus" | "navigate" | "rotate";
interface FifteenAssistSettings {
  highlightMovable: boolean;
  lineSlide: boolean;
  showCorrect: boolean;
  navigationEnabled: boolean;
  rotationEnabled: boolean;
  navigationDepth: 1 | 2 | 3;
  warnCorrect: boolean;
}
const defaults: FifteenAssistSettings = {
  highlightMovable: true,
  lineSlide: true,
  showCorrect: false,
  navigationEnabled: true,
  rotationEnabled: true,
  navigationDepth: 3,
  warnCorrect: true,
};

export function FifteenGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: FifteenPuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<FifteenState>(() => initialGame(puzzle)),
    [message, setMessage] = useState("ゲームを開始しました。"),
    [phase, setPhase] = useState<ResumeChoice>("loading"),
    [settings, setSettings] = useState(() =>
      loadAssistSettings("fifteen", defaults),
    ),
    [settingsOpen, setSettingsOpen] = useState(false),
    [mode, setMode] = useState<AssistMode>("normal"),
    [focusedTile, setFocusedTile] = useState<number | null>(null),
    [firstCorner, setFirstCorner] = useState<number | null>(null),
    [rectangle, setRectangle] = useState<FifteenRectangle | null>(null),
    [previewMoves, setPreviewMoves] = useState<number[]>([]),
    [previewLabel, setPreviewLabel] = useState(""),
    [navigationTarget, setNavigationTarget] = useState<number | null>(null),
    [lastMacroStart, setLastMacroStart] = useState<number | null>(null),
    saved = useRef<FifteenState | undefined>(undefined),
    boardRef = useRef<HTMLDivElement>(null),
    complete = isComplete(state),
    movable = new Set(movableTiles(state.tiles));
  const previewState = useMemo(
      () => applyMoves(state, previewMoves),
      [state, previewMoves],
    ),
    displayedTiles = previewMoves.length ? previewState.tiles : state.tiles,
    navigationPaths = useMemo(
      () =>
        mode === "navigate"
          ? emptyNavigationPaths(state.tiles, settings.navigationDepth)
          : [],
      [mode, state.tiles, settings.navigationDepth],
    ),
    navigationGroups = useMemo(() => {
      const map = new Map<number, EmptyNavigationPath[]>();
      for (const path of navigationPaths)
        map.set(path.target, [...(map.get(path.target) ?? []), path]);
      return map;
    }, [navigationPaths]),
    perimeter = new Set(rectangle ? rectanglePerimeter(rectangle) : []);
  useEffect(() => {
    loadFifteenSession(puzzle)
      .then((session) => {
        saved.current = session;
        setPhase(session ? "ask" : "play");
      })
      .catch(() => {
        setMessage("保存データを読み込めないため、最初から開始します。");
        setPhase("play");
      });
  }, [puzzle]);
  useEffect(() => {
    if (phase !== "play") return;
    if (complete || (!state.history.length && !state.hintCount))
      deleteFifteenSession(puzzle.id);
    else saveFifteenSession(puzzle, state);
  }, [state, complete, puzzle, phase]);
  useEffect(() => saveAssistSettings("fifteen", settings), [settings]);
  useEffect(() => {
    if (phase === "play") boardRef.current?.focus();
  }, [phase]);
  function resetAssist(nextMode: AssistMode = mode) {
    setMode(nextMode);
    setFocusedTile(null);
    setFirstCorner(null);
    setRectangle(null);
    setPreviewMoves([]);
    setPreviewLabel("");
    setNavigationTarget(null);
  }
  function completionMessage(next: FifteenState) {
    return `完成しました！（${next.history.length}手、ヒント使用 ${next.hintCount}回）`;
  }
  function choose(tile: number, index: number) {
    if (complete || previewMoves.length) return;
    if (mode === "focus") {
      if (!tile) return;
      const next = focusedTile === tile ? null : tile;
      setFocusedTile(next);
      setMessage(
        next === null
          ? "駒フォーカスを解除しました。"
          : `駒 ${tile} の目標位置は ${Math.floor(goalIndex(tile) / 4) + 1}行${(goalIndex(tile) % 4) + 1}列です。`,
      );
      return;
    }
    if (mode === "navigate") {
      const paths = navigationGroups.get(index);
      if (!paths) return;
      setNavigationTarget(index);
      setPreviewMoves(paths[0].moves);
      setPreviewLabel(`空欄を${paths[0].moves.length}手で移動`);
      setMessage(
        `到達経路を${paths.length}件表示します。盤面を確認して適用してください。`,
      );
      return;
    }
    if (mode === "rotate") {
      if (firstCorner === null) {
        setFirstCorner(index);
        setRectangle(null);
        setMessage("対角にある2つ目の角を選択してください。");
        return;
      }
      const next = rectangleFromCorners(firstCorner, index);
      if (!next) {
        setFirstCorner(index);
        setRectangle(null);
        setMessage("同じ行・列ではなく、対角の角を選択してください。");
        return;
      }
      if (!rectanglePerimeter(next).includes(state.tiles.indexOf(0))) {
        setFirstCorner(null);
        setRectangle(null);
        setMessage("空欄が外周に含まれる長方形を選択してください。");
        return;
      }
      setRectangle(next);
      setMessage(
        "回転範囲を設定しました。空欄を動かす方向と量を選んでください。",
      );
      return;
    }
    const next = settings.lineSlide ? moveLine(state, tile) : move(state, tile);
    if (next === state) return;
    setState(next);
    const count = next.history.length - state.history.length;
    setMessage(
      isComplete(next)
        ? completionMessage(next)
        : count > 1
          ? `駒 ${tile} まで ${count}手動かしました。`
          : `駒 ${tile} を動かしました。`,
    );
  }
  function direction(row: number, column: number) {
    if (mode !== "normal" || previewMoves.length) return;
    const next = moveEmpty(state, row, column);
    if (next !== state) {
      setState(next);
      setMessage(
        isComplete(next)
          ? completionMessage(next)
          : "矢印キーで駒を動かしました。",
      );
    }
  }
  function keyDown(event: React.KeyboardEvent) {
    const mapping: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    if (mapping[event.key]) {
      event.preventDefault();
      direction(...mapping[event.key]);
    }
  }
  function prepareRotation(
    direction: RotationDirection,
    amount: "step" | "corner" | "lap",
  ) {
    if (!rectangle) return;
    const moves = rotationMoves(state.tiles, rectangle, direction, amount);
    setPreviewMoves(moves);
    setPreviewLabel(
      `空欄を${direction === "clockwise" ? "時計回り" : "反時計回り"}に${amount === "step" ? "1手" : amount === "corner" ? "次の角まで" : "一周"}`,
    );
    const delta =
      correctTileCount(applyMoves(state, moves).tiles) -
      correctTileCount(state.tiles);
    setMessage(
      settings.warnCorrect
        ? `${moves.length}手のプレビューです。正しい位置の駒は${delta > 0 ? ` ${delta}枚増えます` : delta < 0 ? ` ${-delta}枚減ります` : "増減しません"}。`
        : `${moves.length}手のプレビューです。`,
    );
  }
  function applyPreview() {
    if (!previewMoves.length) return;
    const next = applyMoves(state, previewMoves),
      start = state.history.length;
    setState(next);
    setLastMacroStart(start);
    setPreviewMoves([]);
    setNavigationTarget(null);
    setMessage(
      isComplete(next)
        ? completionMessage(next)
        : `${previewLabel}を適用しました（${next.history.length - start}手）。`,
    );
  }
  function undoMacro() {
    if (lastMacroStart === null) return;
    let next = state;
    while (next.history.length > lastMacroStart) next = undo(next);
    setState(next);
    setLastMacroStart(null);
    setPreviewMoves([]);
    setMessage("直前の補助操作をまとめて戻しました。");
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
                setState(saved.current!);
                setMessage("保存済みの進捗から再開しました。");
                setPhase("play");
              }}
            >
              続きから
            </button>
            <button
              className="button secondary"
              onClick={() => {
                deleteFifteenSession(puzzle.id);
                setState(initialGame(puzzle));
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
          <h1>15パズル</h1>
          <strong>{puzzle.title}</strong>
        </div>
        <div className="stats">
          <span>手数: {state.history.length}</span>
          <span>ヒント: {state.hintCount}回</span>
          <span>
            操作:{" "}
            {mode === "normal"
              ? "通常"
              : mode === "focus"
                ? "駒フォーカス"
                : mode === "navigate"
                  ? "空欄ナビ"
                  : "回転"}
          </span>
        </div>
        <div className="assist-mode-switch actions">
          <button
            className={`button secondary ${mode === "normal" ? "active" : ""}`}
            onClick={() => resetAssist("normal")}
          >
            通常操作
          </button>
          <button
            className={`button secondary ${mode === "focus" ? "active" : ""}`}
            onClick={() => resetAssist("focus")}
          >
            駒フォーカス
          </button>
          {settings.navigationEnabled && (
            <button
              className={`button secondary ${mode === "navigate" ? "active" : ""}`}
              onClick={() => {
                resetAssist("navigate");
                setMessage(
                  "空欄の移動先を選択してください。数字は必要手数です。",
                );
              }}
            >
              空欄移動ナビ
            </button>
          )}
          {settings.rotationEnabled && (
            <button
              className={`button secondary ${mode === "rotate" ? "active" : ""}`}
              onClick={() => {
                resetAssist("rotate");
                setMessage("長方形の対角となる2つの角を選択してください。");
              }}
            >
              回転モード
            </button>
          )}
        </div>
        <div className="board-wrap">
          <div
            className="fifteen-board"
            role="grid"
            aria-label="15パズル盤面"
            tabIndex={0}
            ref={boardRef}
            onKeyDown={keyDown}
          >
            {displayedTiles.map((displayedTile, index) => {
              const actualTile = state.tiles[index],
                target =
                  focusedTile !== null && index === goalIndex(focusedTile),
                navPaths = navigationGroups.get(index),
                previewChanged = displayedTile !== actualTile;
              return (
                <button
                  key={displayedTile}
                  data-nav-steps={
                    mode === "navigate" && navPaths
                      ? Math.min(...navPaths.map((path) => path.moves.length))
                      : undefined
                  }
                  className={`fifteen-tile ${displayedTile === 0 ? "empty" : ""} ${displayedTile === state.hintTile ? "hinted" : ""} ${settings.highlightMovable && mode === "normal" && movable.has(displayedTile) ? "movable" : ""} ${settings.showCorrect && isCorrectPosition(displayedTiles, index) ? "correct" : ""} ${displayedTile === focusedTile ? "focused-tile" : ""} ${target ? "focus-target" : ""} ${mode === "navigate" && navPaths ? "nav-target" : ""} ${navigationTarget === index ? "nav-selected" : ""} ${perimeter.has(index) ? "rotation-perimeter" : ""} ${firstCorner === index ? "rotation-corner" : ""} ${previewChanged ? "macro-preview" : ""}`}
                  aria-label={
                    displayedTile === 0
                      ? `空きマス ${Math.floor(index / 4) + 1}行${(index % 4) + 1}列`
                      : `駒 ${displayedTile}`
                  }
                  disabled={
                    complete ||
                    Boolean(previewMoves.length) ||
                    (mode === "normal" && displayedTile === 0)
                  }
                  onClick={() => choose(actualTile, index)}
                >
                  {displayedTile || ""}
                </button>
              );
            })}
          </div>
        </div>
        <MessagePanel message={message} logKey={`fifteen:${puzzle.id}`} />
        {mode === "navigate" && navigationTarget !== null && (
          <div className="macro-controls">
            <p>経路候補</p>
            <div className="actions">
              {navigationGroups.get(navigationTarget)?.map((path, index) => (
                <button
                  key={path.moves.join("-")}
                  className={`button secondary ${previewMoves.join() === path.moves.join() ? "active" : ""}`}
                  onClick={() => {
                    setPreviewMoves(path.moves);
                    setPreviewLabel(`空欄を${path.moves.length}手で移動`);
                  }}
                >
                  候補 {index + 1}（{path.moves.length}手）
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === "rotate" && rectangle && (
          <div className="macro-controls">
            <p>空欄の移動方向</p>
            {(["clockwise", "counterclockwise"] as RotationDirection[]).map(
              (direction) => (
                <div className="actions" key={direction}>
                  <strong>
                    {direction === "clockwise" ? "時計回り" : "反時計回り"}
                  </strong>
                  <button
                    className="button secondary"
                    onClick={() => prepareRotation(direction, "step")}
                  >
                    1手
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => prepareRotation(direction, "corner")}
                  >
                    次の角まで
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => prepareRotation(direction, "lap")}
                  >
                    一周
                  </button>
                </div>
              ),
            )}
          </div>
        )}
        {previewMoves.length > 0 && (
          <div className="actions preview-actions">
            <strong>
              {previewLabel}：{previewMoves.length}手
            </strong>
            <button className="button" onClick={applyPreview}>
              この手順を適用
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setPreviewMoves([]);
                setNavigationTarget(null);
                setMessage("プレビューを取り消しました。");
              }}
            >
              取消
            </button>
          </div>
        )}
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
                  checked={settings.highlightMovable}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      highlightMovable: event.target.checked,
                    })
                  }
                />{" "}
                動かせる駒を強調
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.lineSlide}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      lineSlide: event.target.checked,
                    })
                  }
                />{" "}
                同じ行・列の駒をまとめてスライド
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.showCorrect}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      showCorrect: event.target.checked,
                    })
                  }
                />{" "}
                正しい位置の駒を表示
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.navigationEnabled}
                  onChange={(event) => {
                    setSettings({
                      ...settings,
                      navigationEnabled: event.target.checked,
                    });
                    if (!event.target.checked && mode === "navigate")
                      resetAssist("normal");
                  }}
                />{" "}
                空欄移動ナビを使用
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.rotationEnabled}
                  onChange={(event) => {
                    setSettings({
                      ...settings,
                      rotationEnabled: event.target.checked,
                    });
                    if (!event.target.checked && mode === "rotate")
                      resetAssist("normal");
                  }}
                />{" "}
                回転モードを使用
              </label>
              <label>
                ナビ探索手数{" "}
                <select
                  value={settings.navigationDepth}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      navigationDepth: Number(event.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>1手</option>
                  <option value={2}>2手</option>
                  <option value={3}>3手</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.warnCorrect}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      warnCorrect: event.target.checked,
                    })
                  }
                />{" "}
                正しい位置の駒の増減を表示
              </label>
              <p>
                時計回り・反時計回りは空欄の移動方向です。適用した操作は実際の駒移動数だけ手数へ加算します。
              </p>
            </div>
          )}
        </div>
        <h2 className="action-heading">ヒント</h2>
        <div className="actions">
          <button
            className="button hint"
            disabled={complete}
            onClick={() => {
              const next = nextHint(puzzle, state);
              setState(next);
              setMessage(
                next === state
                  ? "表示中のヒントを維持します。"
                  : `駒 ${next.hintTile} を動かしてください。`,
              );
            }}
          >
            次に動かす駒を表示
          </button>
        </div>
        <GameFooter
          onBack={onBack}
          onLauncher={onLauncher}
          left={
            <>
              <button
                className="button secondary"
                disabled={!state.history.length || complete}
                onClick={() => {
                  setState(undo(state));
                  setLastMacroStart(null);
                  setMessage("一手戻しました。");
                }}
              >
                一手戻す
              </button>
              <button
                className="button secondary"
                disabled={lastMacroStart === null}
                onClick={undoMacro}
              >
                補助操作をまとめて戻す
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  if (confirm("盤面を初期状態に戻しますか？")) {
                    setState(initialGame(puzzle));
                    setLastMacroStart(null);
                    resetAssist("normal");
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
