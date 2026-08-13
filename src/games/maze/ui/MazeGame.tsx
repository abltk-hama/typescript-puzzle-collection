import { useEffect, useRef, useState } from "react";
import {
  GameFooter,
  MessagePanel,
} from "../../../common/components/GameChrome";
import {
  loadAssistSettings,
  saveAssistSettings,
} from "../../../common/storage/gameAssistSettings";
import {
  DOWN,
  LEFT,
  RIGHT,
  UP,
  applyPath,
  beginPreview,
  currentPosition,
  initialGame,
  isComplete,
  keyOf,
  moveTo,
  neighbors,
  nextHint,
  samePosition,
  segmentOptions,
  solutionPath,
  undo,
  visitedDecisionPoints,
  type MazePuzzle,
  type MazeState,
  type Position,
} from "../domain/maze";
import {
  deleteMazeSession,
  loadMazeSession,
  saveMazeSession,
} from "../data/sessions";

type Speed = "slow" | "normal" | "fast" | "instant";
interface MazeAssistSettings {
  autoEnabled: boolean;
  previewEnabled: boolean;
  speed: Speed;
  fastGoal: boolean;
  previewSegments: 1 | 2 | 3;
  zoomSize: 7 | 9 | 11;
  showVisited: boolean;
  returnToDetail: boolean;
}
const defaults: MazeAssistSettings = {
  autoEnabled: true,
  previewEnabled: true,
  speed: "normal",
  fastGoal: true,
  previewSegments: 1,
  zoomSize: 9,
  showVisited: true,
  returnToDetail: true,
};
const speedMs: Record<Speed, number> = {
  slow: 350,
  normal: 180,
  fast: 70,
  instant: 0,
};
const directionNames: Record<string, string> = {
  U: "上",
  R: "右",
  D: "下",
  L: "左",
};

function MazeMap({
  puzzle,
  state,
  displayPosition,
  path,
  previewPath,
  view,
  zoomSize,
  showVisited,
  onCell,
  boardRef,
}: {
  puzzle: MazePuzzle;
  state: MazeState;
  displayPosition: Position;
  path: Position[];
  previewPath: Position[];
  view: "overview" | "detail";
  zoomSize: number;
  showVisited: boolean;
  onCell: (position: Position) => void;
  boardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const half = Math.floor(zoomSize / 2),
    rowStart =
      view === "overview"
        ? 0
        : Math.max(
            0,
            Math.min(puzzle.height - zoomSize, displayPosition.row - half),
          ),
    columnStart =
      view === "overview"
        ? 0
        : Math.max(
            0,
            Math.min(puzzle.width - zoomSize, displayPosition.column - half),
          ),
    rows =
      view === "overview" ? puzzle.height : Math.min(zoomSize, puzzle.height),
    columns =
      view === "overview" ? puzzle.width : Math.min(zoomSize, puzzle.width),
    visits = new Set(state.history.map(keyOf)),
    planned = new Set(path.map(keyOf)),
    preview = new Set(previewPath.map(keyOf)),
    nextTarget = path.at(-1),
    previewTarget = previewPath.at(-1),
    cells = [];
  for (let row = rowStart; row < rowStart + rows; row++)
    for (let column = columnStart; column < columnStart + columns; column++) {
      const index = row * puzzle.width + column,
        mask = puzzle.passages[index],
        position = { row, column },
        isCurrent = samePosition(position, displayPosition),
        isStart = samePosition(position, puzzle.start),
        isGoal = samePosition(position, puzzle.goal),
        isHint = Boolean(
          state.hintPosition && samePosition(position, state.hintPosition),
        ),
        isNext = Boolean(nextTarget && samePosition(position, nextTarget)),
        isPreviewTarget = Boolean(
          previewTarget && samePosition(position, previewTarget),
        );
      cells.push(
        <button
          key={index}
          role="gridcell"
          aria-label={`${row + 1}行${column + 1}列${isCurrent ? " 現在位置" : ""}${isStart ? " 入口" : ""}${isGoal ? " ゴール" : ""}`}
          className={`maze-cell ${showVisited && visits.has(keyOf(position)) ? "visited" : ""} ${planned.has(keyOf(position)) ? "auto-path" : ""} ${preview.has(keyOf(position)) ? "preview-path" : ""} ${isNext ? "next-decision" : ""} ${isPreviewTarget ? "preview-decision" : ""} ${isStart ? "start" : ""} ${isGoal ? "goal" : ""} ${isHint ? "hinted" : ""}`}
          style={{
            borderTop: mask & UP ? "0" : "var(--wall)",
            borderRight: mask & RIGHT ? "0" : "var(--wall)",
            borderBottom: mask & DOWN ? "0" : "var(--wall)",
            borderLeft: mask & LEFT ? "0" : "var(--wall)",
          }}
          onClick={() => onCell(position)}
        >
          {isStart && <span className="endpoint">S</span>}
          {isGoal && <span className="endpoint">G</span>}
          {isCurrent && <span className="maze-player" />}
          {isNext && <span className="maze-pointer">●</span>}
          {isPreviewTarget && <span className="maze-preview-player">●</span>}
        </button>,
      );
    }
  return (
    <div
      className={`maze-board ${view}`}
      aria-label={view === "overview" ? "迷路全体図" : "迷路拡大図"}
      role="grid"
      tabIndex={view === "detail" ? 0 : -1}
      ref={boardRef}
      style={{
        gridTemplateColumns: `repeat(${columns},1fr)`,
        ["--maze-size" as string]: columns,
      }}
    >
      {cells}
    </div>
  );
}

export function MazeGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: MazePuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<MazeState>(() => initialGame(puzzle)),
    [message, setMessage] = useState("ゲームを開始しました。"),
    [phase, setPhase] = useState<"loading" | "ask" | "play">("loading"),
    [settings, setSettings] = useState(() =>
      loadAssistSettings("maze", defaults),
    ),
    [settingsOpen, setSettingsOpen] = useState(false),
    [mapView, setMapView] = useState<"detail" | "overview">("detail"),
    [displayPosition, setDisplayPosition] = useState(puzzle.start),
    [autoPath, setAutoPath] = useState<Position[]>([]),
    [previewPath, setPreviewPath] = useState<Position[]>([]),
    [previewSegments, setPreviewSegments] = useState(0),
    [, setQueuedPath] = useState<Position[]>([]),
    [animating, setAnimating] = useState(false),
    saved = useRef<MazeState | undefined>(undefined),
    board = useRef<HTMLDivElement>(null),
    stateRef = useRef(state),
    queuedPathRef = useRef<Position[]>([]),
    cancelAnimation = useRef(0),
    complete = isComplete(puzzle, state),
    current = currentPosition(state),
    previous = state.history.length > 1 ? state.history.at(-2) : undefined;
  stateRef.current = state;
  const options = segmentOptions(puzzle, current, previous),
    previewEnd = previewPath.at(-1),
    previewPrevious = previewPath.length > 1 ? previewPath.at(-2) : current,
    previewOptions = previewEnd
      ? segmentOptions(puzzle, previewEnd, previewPrevious)
      : [],
    junctions = visitedDecisionPoints(puzzle, state).filter(
      (position) => !samePosition(position, current),
    ),
    goalRoute = solutionPath(puzzle, current, puzzle.goal),
    goalIsForced =
      goalRoute.length > 1 &&
      goalRoute
        .slice(0, -1)
        .every(
          (position, index) =>
            index === 0 || neighbors(puzzle, position).length === 2,
        );
  useEffect(() => {
    loadMazeSession(puzzle)
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
    if (
      complete ||
      (state.history.length === 1 && !state.hintCount && !state.trialCount)
    )
      deleteMazeSession(puzzle.id);
    else saveMazeSession(puzzle, state);
  }, [state, complete, puzzle, phase]);
  useEffect(() => saveAssistSettings("maze", settings), [settings]);
  useEffect(() => {
    if (phase === "play") board.current?.focus();
  }, [phase]);
  useEffect(
    () => () => {
      cancelAnimation.current++;
    },
    [],
  );
  function finishMessage(next: MazeState) {
    return `ゴールに到着しました！（実手数 ${next.history.length - 1}手／試行 ${next.trialCount}回／ヒント ${next.hintCount}回）`;
  }
  async function animate(
    path: Position[],
    label: string,
    continuation = false,
  ) {
    if (!path.length || (animating && !continuation)) return;
    setPreviewPath([]);
    setAnimating(true);
    setAutoPath(path);
    if (settings.returnToDetail) setMapView("detail");
    const token = ++cancelAnimation.current,
      delay =
        goalIsForced && settings.fastGoal
          ? Math.min(speedMs[settings.speed], 50)
          : speedMs[settings.speed];
    for (const position of path) {
      if (token !== cancelAnimation.current) return;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      setDisplayPosition(position);
    }
    if (token !== cancelAnimation.current) return;
    const next = applyPath(puzzle, stateRef.current, path);
    setState(next);
    stateRef.current = next;
    setAutoPath([]);
    setMessage(isComplete(puzzle, next) ? finishMessage(next) : label);
    const queued = queuedPathRef.current;
    if (queued.length && !isComplete(puzzle, next)) {
      queuedPathRef.current = [];
      setQueuedPath([]);
      await animate(queued, `${queued.length}マス予約進行しました。`, true);
      return;
    }
    setAnimating(false);
  }
  function manualMove(target: Position) {
    if (animating || previewPath.length) return;
    const next = moveTo(puzzle, state, target);
    if (next === state) return;
    setState(next);
    setDisplayPosition(target);
    setMessage(
      isComplete(puzzle, next) ? finishMessage(next) : "一マス進みました。",
    );
  }
  function beginBranchPreview(path: Position[]) {
    if (!settings.previewEnabled || animating) return;
    const next = beginPreview(state);
    setState(next);
    stateRef.current = next;
    setPreviewPath(path);
    setPreviewSegments(1);
    setMessage(
      `分岐を仮進行しました（${path.length}マス）。確定するまで実手数には含まれません。`,
    );
  }
  function extendPreview(path: Position[]) {
    if (previewSegments >= settings.previewSegments) return;
    setPreviewPath((currentPath) => [...currentPath, ...path]);
    setPreviewSegments((count) => count + 1);
    setMessage("次の判断地点までプレビューを延長しました。");
  }
  function confirmPreview() {
    const path = [...previewPath];
    setPreviewPath([]);
    setPreviewSegments(0);
    void animate(path, `${path.length}マス自動進行しました。`);
  }
  function direction(dr: number, dc: number) {
    manualMove({ row: current.row + dr, column: current.column + dc });
  }
  function keyDown(event: React.KeyboardEvent) {
    const mapping: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      w: [-1, 0],
      W: [-1, 0],
      ArrowDown: [1, 0],
      s: [1, 0],
      S: [1, 0],
      ArrowLeft: [0, -1],
      a: [0, -1],
      A: [0, -1],
      ArrowRight: [0, 1],
      d: [0, 1],
      D: [0, 1],
    };
    if (mapping[event.key]) {
      event.preventDefault();
      direction(...mapping[event.key]);
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
          <p>この迷路には保存済みの進捗があります。</p>
          <div className="actions">
            <button
              className="button"
              onClick={() => {
                const restored = saved.current!;
                setState(restored);
                stateRef.current = restored;
                setDisplayPosition(currentPosition(restored));
                setMessage("保存済みの確定位置から再開しました。");
                setPhase("play");
              }}
            >
              続きから
            </button>
            <button
              className="button secondary"
              onClick={() => {
                deleteMazeSession(puzzle.id);
                const fresh = initialGame(puzzle);
                setState(fresh);
                setDisplayPosition(puzzle.start);
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
  const directionButtons = (
    items: ReturnType<typeof segmentOptions>,
    preview = false,
  ) =>
    items.map((option) => (
      <button
        key={`${option.code}-${keyOf(option.path.at(-1)!)}`}
        className="button secondary"
        disabled={animating}
        onClick={() =>
          animating
            ? ((queuedPathRef.current = option.path),
              setQueuedPath(option.path),
              setMessage(
                `${directionNames[option.code]}方向を次の進路として予約しました。`,
              ))
            : preview
              ? extendPreview(option.path)
              : settings.previewEnabled
                ? beginBranchPreview(option.path)
                : void animate(
                    option.path,
                    `${option.path.length}マス自動進行しました。`,
                  )
        }
      >
        {directionNames[option.code]}へ（{option.path.length}マス）
      </button>
    ));
  return (
    <main className="shell">
      <section className="panel" onKeyDown={keyDown}>
        <div className="toolbar">
          <h1>迷路</h1>
          <strong>
            {puzzle.title} / {puzzle.width}×{puzzle.height}
          </strong>
        </div>
        <div className="stats">
          <span>実手数: {state.history.length - 1}</span>
          <span>試行: {state.trialCount}回</span>
          <span>ヒント: {state.hintCount}回</span>
        </div>
        <div className="maze-view-tabs actions">
          <button
            className={`button secondary ${mapView === "detail" ? "active" : ""}`}
            onClick={() => setMapView("detail")}
          >
            拡大図
          </button>
          <button
            className={`button secondary ${mapView === "overview" ? "active" : ""}`}
            onClick={() => setMapView("overview")}
          >
            全体図
          </button>
        </div>
        <div className="maze-maps">
          <section
            className={`maze-map-pane overview ${mapView === "overview" ? "active" : ""}`}
          >
            <h2>全体図</h2>
            <MazeMap
              puzzle={puzzle}
              state={state}
              displayPosition={displayPosition}
              path={autoPath}
              previewPath={previewPath}
              view="overview"
              zoomSize={settings.zoomSize}
              showVisited={settings.showVisited}
              onCell={() => {}}
            />
          </section>
          <section
            className={`maze-map-pane detail ${mapView === "detail" ? "active" : ""}`}
          >
            <h2>拡大図</h2>
            <MazeMap
              puzzle={puzzle}
              state={state}
              displayPosition={displayPosition}
              path={autoPath}
              previewPath={previewPath}
              view="detail"
              zoomSize={settings.zoomSize}
              showVisited={settings.showVisited}
              onCell={manualMove}
              boardRef={board}
            />
            {(autoPath.length || goalIsForced) && (
              <p className="maze-direction-marker">
                {autoPath.length
                  ? "● 赤い破線の判断地点へ進行"
                  : "◆ ゴールまで一本道です"}
              </p>
            )}
          </section>
        </div>
        <MessagePanel message={message} />
        {settings.autoEnabled && !complete && (
          <div className="maze-branch-controls">
            <h2>
              {previewPath.length
                ? "プレビュー"
                : animating
                  ? "次の分岐を先行選択"
                  : "分岐を選択"}
            </h2>
            {!previewPath.length && (
              <div className="actions">
                {directionButtons(
                  animating && autoPath.length
                    ? segmentOptions(
                        puzzle,
                        autoPath.at(-1)!,
                        autoPath.length > 1 ? autoPath.at(-2) : current,
                      )
                    : options,
                )}
              </div>
            )}
            {previewPath.length > 0 && (
              <>
                <div className="actions">
                  <button className="button" onClick={confirmPreview}>
                    この経路を確定
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setPreviewPath([]);
                      setPreviewSegments(0);
                      setMessage("分岐点へ戻りました。");
                    }}
                  >
                    分岐点へ戻る
                  </button>
                </div>
                {previewSegments < settings.previewSegments &&
                  previewOptions.length > 0 && (
                    <>
                      <p>さらに先を確認</p>
                      <div className="actions">
                        {directionButtons(previewOptions, true)}
                      </div>
                    </>
                  )}
              </>
            )}
          </div>
        )}
        {!settings.autoEnabled && (
          <>
            <p className="operation-help">
              方向ボタン / 矢印キー / WASD / 隣接マスを選択
            </p>
            <div className="maze-dpad" aria-label="迷路方向パッド">
              <button
                className="button secondary up"
                aria-label="上へ進む"
                disabled={complete || animating}
                onClick={() => direction(-1, 0)}
              >
                ▲
              </button>
              <button
                className="button secondary left"
                aria-label="左へ進む"
                disabled={complete || animating}
                onClick={() => direction(0, -1)}
              >
                ◀
              </button>
              <button
                className="button secondary down"
                aria-label="下へ進む"
                disabled={complete || animating}
                onClick={() => direction(1, 0)}
              >
                ▼
              </button>
              <button
                className="button secondary right"
                aria-label="右へ進む"
                disabled={complete || animating}
                onClick={() => direction(0, 1)}
              >
                ▶
              </button>
            </div>
          </>
        )}
        {junctions.length > 0 && (
          <div className="maze-return">
            <h2>通過済み分岐点から再開</h2>
            <div className="actions">
              {junctions.map((position, index) => (
                <button
                  key={keyOf(position)}
                  className="button secondary"
                  disabled={animating}
                  onClick={() =>
                    void animate(
                      solutionPath(puzzle, current, position).slice(1),
                      `分岐点 ${index + 1} へ戻りました。`,
                    )
                  }
                >
                  分岐 {index + 1}
                </button>
              ))}
            </div>
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
                  checked={settings.autoEnabled}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      autoEnabled: event.target.checked,
                    })
                  }
                />{" "}
                分岐間の自動進行
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.previewEnabled}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      previewEnabled: event.target.checked,
                    })
                  }
                />{" "}
                分岐プレビュー
              </label>
              <label>
                進行速度{" "}
                <select
                  value={settings.speed}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      speed: event.target.value as Speed,
                    })
                  }
                >
                  <option value="slow">ゆっくり</option>
                  <option value="normal">標準</option>
                  <option value="fast">速い</option>
                  <option value="instant">瞬時</option>
                </select>
              </label>
              <label>
                連鎖プレビュー{" "}
                <select
                  value={settings.previewSegments}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      previewSegments: Number(event.target.value) as 1 | 2 | 3,
                    })
                  }
                >
                  <option value={1}>1区間</option>
                  <option value={2}>2区間</option>
                  <option value={3}>3区間</option>
                </select>
              </label>
              <label>
                拡大図{" "}
                <select
                  value={settings.zoomSize}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      zoomSize: Number(event.target.value) as 7 | 9 | 11,
                    })
                  }
                >
                  <option value={7}>7×7</option>
                  <option value={9}>9×9</option>
                  <option value={11}>11×11</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.fastGoal}
                  onChange={(event) =>
                    setSettings({ ...settings, fastGoal: event.target.checked })
                  }
                />{" "}
                ゴールまで一本道なら高速化
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.showVisited}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      showVisited: event.target.checked,
                    })
                  }
                />{" "}
                通過済み経路を表示
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.returnToDetail}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      returnToDetail: event.target.checked,
                    })
                  }
                />{" "}
                自動進行時に拡大図へ戻る
              </label>
            </div>
          )}
        </div>
        <h2 className="action-heading">ヒント</h2>
        <div className="actions">
          <button
            className="button hint"
            disabled={complete || animating}
            onClick={() => {
              const next = nextHint(puzzle, state);
              setState(next);
              stateRef.current = next;
              setMessage(
                next === state
                  ? "表示中のヒントを維持します。"
                  : "次に進むマスを表示しました。",
              );
            }}
          >
            次に進むマスを表示
          </button>
        </div>
        <GameFooter
          onBack={onBack}
          onLauncher={onLauncher}
          left={
            <>
              <button
                className="button secondary"
                disabled={state.history.length <= 1 || complete || animating}
                onClick={() => {
                  const next = undo(state);
                  setState(next);
                  setDisplayPosition(currentPosition(next));
                  setMessage("一手戻しました。");
                }}
              >
                一手戻す
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  if (confirm("スタートに戻りますか？")) {
                    cancelAnimation.current++;
                    const fresh = initialGame(puzzle);
                    setState(fresh);
                    stateRef.current = fresh;
                    setDisplayPosition(puzzle.start);
                    setAutoPath([]);
                    setPreviewPath([]);
                    setAnimating(false);
                    queuedPathRef.current = [];
                    setQueuedPath([]);
                    setMessage("スタートに戻りました。");
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
