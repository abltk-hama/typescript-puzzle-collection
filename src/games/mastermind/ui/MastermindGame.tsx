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
  attentionGroups,
  addGuessColorsToNotes,
  candidateCount,
  classifyGuess,
  clearSelected,
  copyGuess,
  cycleColorNote,
  excludedColors,
  guessComparisons,
  initialGame,
  inputConsistency,
  isFinished,
  isLost,
  isWon,
  logicalAnalysis,
  organizeNotesFromSelection,
  replaceNotesFromSelection,
  revealPosition,
  selectPosition,
  setGuessNote,
  setSymbol,
  submitGuess,
  togglePin,
  togglePositionNote,
  type GuessResult,
  type MastermindPuzzle,
  type MastermindState,
} from "../domain/mastermind";
import {
  deleteMastermindSession,
  loadMastermindSession,
  saveMastermindSession,
} from "../data/sessions";
const colors = [
  "",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];
const groupLabels = {
  both: "完全一致＋色一致",
  exact: "完全一致のみ",
  misplaced: "色一致のみ",
  none: "一致なし",
};
interface Settings {
  consistencyWarning: boolean;
  duplicateWarning: boolean;
  showExcluded: boolean;
  organizationLevel: 0 | 1 | 2 | 3 | 4;
}
const defaults: Settings = {
  consistencyWarning: true,
  duplicateWarning: true,
  showExcluded: true,
  organizationLevel: 0,
};
function ColorDot({ value, mark }: { value: number; mark?: string }) {
  return (
    <i className="mastermind-dot" style={{ backgroundColor: colors[value] }}>
      {value}
      {mark && <b>{mark}</b>}
    </i>
  );
}
export function MastermindGame({
  puzzle,
  onBack,
  onLauncher,
}: {
  puzzle: MastermindPuzzle;
  onBack: () => void;
  onLauncher: () => void;
}) {
  const [state, setState] = useState<MastermindState>(() =>
      initialGame(puzzle),
    ),
    [message, setMessage] = useState("ゲームを開始しました。"),
    [phase, setPhase] = useState<"loading" | "ask" | "play">("loading"),
    [settings, setSettings] = useState(() =>
      loadAssistSettings("mastermind", defaults),
    ),
    [settingsOpen, setSettingsOpen] = useState(false),
    [memoMode, setMemoMode] = useState(false),
    [selectedHistories, setSelectedHistories] = useState<number[]>([]),
    [selectionResult, setSelectionResult] = useState<ReturnType<
      typeof logicalAnalysis
    > | null>(null),
    [logicResult, setLogicResult] = useState<ReturnType<
      typeof logicalAnalysis
    > | null>(null),
    saved = useRef<MastermindState | undefined>(undefined),
    area = useRef<HTMLDivElement>(null),
    finished = isFinished(puzzle, state),
    consistency = inputConsistency(state),
    excluded = excludedColors(state),
    comparisons = guessComparisons(state),
    attention = attentionGroups(puzzle, state),
    pinnedCodes = state.pinnedGuesses
      .map((index) => state.guesses[index]?.code)
      .filter((code): code is number[] => Boolean(code)),
    pinnedDifferencePositions = state.current
      .map((value, index) =>
        pinnedCodes.length &&
        value !== null &&
        pinnedCodes.some((code) => code[index] !== value)
          ? index
          : -1,
      )
      .filter((index) => index >= 0);
  useEffect(() => {
    loadMastermindSession(puzzle)
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
    const progress =
      state.guesses.length ||
      state.hintCount ||
      state.current.some((value) => value !== null) ||
      state.positionNotes.some((notes) => notes.length);
    if (finished || !progress) deleteMastermindSession(puzzle.id);
    else saveMastermindSession(puzzle, state);
  }, [state, finished, puzzle, phase]);
  useEffect(() => saveAssistSettings("mastermind", settings), [settings]);
  useEffect(() => {
    if (phase === "play") area.current?.focus();
  }, [phase]);
  function input(value: number) {
    if (memoMode) {
      setState(togglePositionNote(puzzle, state, state.selected, value));
      setMessage(`位置 ${state.selected + 1} の候補メモを切り替えました。`);
      return;
    }
    const next = setSymbol(puzzle, state, value);
    if (next === state) {
      setMessage("その数字は現在の位置へ入力できません。");
      return;
    }
    setState(next);
    setLogicResult(null);
    setMessage(`数字 ${value} を入力しました。`);
  }
  function submit() {
    const duplicate = state.guesses.findIndex((guess) =>
      guess.code.every((value, index) => value === state.current[index]),
    );
    if (
      settings.duplicateWarning &&
      duplicate >= 0 &&
      !confirm(`${duplicate + 1}手目と同じ予想です。提出しますか？`)
    )
      return;
    if (
      settings.consistencyWarning &&
      !consistency.consistent &&
      !confirm(
        `${consistency.conflicts.map((index) => index + 1).join("・")}手目の判定と矛盾します。提出しますか？`,
      )
    )
      return;
    const next = submitGuess(puzzle, state);
    if (next === state) {
      setMessage("すべての位置へ数字を入力してください。");
      return;
    }
    setState(next);
    setLogicResult(null);
    const result = next.guesses.at(-1)!;
    if (isWon(puzzle, next))
      setMessage(
        `正解です！（${next.guesses.length}回、ヒント使用 ${next.hintCount}回）`,
      );
    else if (isLost(puzzle, next))
      setMessage(`回数切れです。正解は ${puzzle.secret.join(" ")} でした。`);
    else
      setMessage(
        `判定: 正しい位置 ${result.exact} / 別の位置 ${result.misplaced}`,
      );
  }
  function keyDown(event: React.KeyboardEvent) {
    if (/^[1-8]$/.test(event.key)) {
      input(Number(event.key));
      event.preventDefault();
    } else if (["Delete", "Backspace", "0"].includes(event.key)) {
      setState(clearSelected(puzzle, state));
      event.preventDefault();
    } else if (event.key === "Enter") {
      submit();
      event.preventDefault();
    }
  }
  function setLevel(level: 0 | 1 | 2 | 3 | 4) {
    setSettings({ ...settings, organizationLevel: level });
    if (level !== 4) setLogicResult(null);
    if (level === 4) {
      if (!state.guesses.length) {
        setMessage("回答履歴がまだありません。");
        return;
      }
      const counted = candidateCount(puzzle, state);
      setState(counted.state);
      setLogicResult(logicalAnalysis(puzzle, state));
      setMessage(
        `論理整理を実行しました。整合候補は ${counted.count} 通りです。${counted.counted ? "ヒントを1回使用しました。" : "同じ履歴状態のためヒント回数は増えません。"}`,
      );
    }
  }
  function toggleHistorySelection(index: number) {
    if (selectedHistories.includes(index)) {
      setSelectedHistories(
        selectedHistories.filter((value) => value !== index),
      );
      setSelectionResult(null);
      return;
    }
    if (selectedHistories.length >= 3) {
      setMessage("整理対象にできる履歴は3件までです。");
      return;
    }
    setSelectedHistories([...selectedHistories, index]);
    setSelectionResult(null);
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
                setPhase("play");
              }}
            >
              続きから
            </button>
            <button
              className="button secondary"
              onClick={() => {
                deleteMastermindSession(puzzle.id);
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
  const renderHistory = (result: GuessResult, index: number) => (
    <article
      className={`mastermind-history-card ${state.pinnedGuesses.includes(index) ? "pinned" : ""} ${consistency.conflicts.includes(index) ? "history-conflict" : ""}`}
      key={index}
    >
      <header>
        <strong>{index + 1}手目</strong>
        <span>
          完全 {result.exact}／色 {result.misplaced}
        </span>
      </header>
      <div className="history-code">
        {result.code.map((value, position) => (
          <ColorDot key={position} value={value} />
        ))}
      </div>
      {state.guessNotes[index] && <p>{state.guessNotes[index]}</p>}
      <div className="actions">
        <button
          className={`button secondary ${selectedHistories.includes(index) ? "active" : ""}`}
          onClick={() => toggleHistorySelection(index)}
        >
          {selectedHistories.includes(index) ? "整理対象から外す" : "整理対象"}
        </button>
        <button
          className="button secondary"
          onClick={() => {
            setState(addGuessColorsToNotes(puzzle, state, index));
            setMessage(
              `${index + 1}手目の色を全位置の候補メモへ追加しました。`,
            );
          }}
        >
          色をメモへ追加
        </button>
        <button
          className="button secondary"
          onClick={() => setState(togglePin(state, index))}
        >
          {state.pinnedGuesses.includes(index) ? "ピン解除" : "比較ピン"}
        </button>
        <button
          className="button secondary"
          onClick={() => {
            setState(copyGuess(puzzle, state, index));
            setMessage(`${index + 1}手目を入力欄へコピーしました。`);
          }}
        >
          コピー
        </button>
        <button
          className="button secondary"
          onClick={() => {
            const note = prompt(
              "履歴メモ（40文字まで）",
              state.guessNotes[index] ?? "",
            );
            if (note !== null) setState(setGuessNote(state, index, note));
          }}
        >
          メモ
        </button>
      </div>
    </article>
  );
  return (
    <main className="shell">
      <section
        className="panel mastermind-area"
        ref={area}
        tabIndex={0}
        onKeyDown={keyDown}
      >
        <div className="toolbar">
          <h1>マスターマインド</h1>
          <strong>{puzzle.title}</strong>
        </div>
        <div className="stats">
          <span>残り: {puzzle.maxAttempts - state.guesses.length}回</span>
          <span>ヒント: {state.hintCount}回</span>
          <span>重複: {puzzle.allowDuplicates ? "あり" : "なし"}</span>
        </div>
        <div
          className={`mastermind-input ${settings.consistencyWarning && !consistency.consistent ? "inconsistent" : ""}`}
        >
          {state.current.map((value, index) => (
            <button
              key={index}
              aria-label={`入力位置 ${index + 1}${state.revealed[index] !== undefined ? " 公開済み" : ""}`}
              className={`code-slot ${state.selected === index ? "selected" : ""} ${state.revealed[index] !== undefined ? "locked" : ""} ${pinnedDifferencePositions.includes(index) ? "pin-difference" : ""}`}
              style={value ? { backgroundColor: colors[value] } : undefined}
              onClick={() => setState(selectPosition(puzzle, state, index))}
            >
              {value ?? "?"}
              {state.positionNotes[index].length > 0 && (
                <small>{state.positionNotes[index].join("·")}</small>
              )}
            </button>
          ))}
        </div>
        {pinnedCodes.length > 0 && (
          <p className="pin-difference-summary">
            比較ピンとの差分:{" "}
            {pinnedDifferencePositions.length
              ? `位置 ${pinnedDifferencePositions.map((index) => index + 1).join("・")}`
              : state.current.some((value) => value === null)
                ? "入力中"
                : "なし"}
          </p>
        )}
        <div className="mastermind-palette">
          {Array.from(
            { length: puzzle.symbolCount },
            (_, index) => index + 1,
          ).map((value) => (
            <button
              key={value}
              aria-label={`数字 ${value}`}
              className={`${settings.showExcluded && excluded.has(value) ? "excluded" : ""} ${state.colorNotes[value] ?? "unknown"}`}
              style={{ backgroundColor: colors[value] }}
              onClick={() => input(value)}
              onContextMenu={(event) => {
                event.preventDefault();
                setState(cycleColorNote(state, value));
              }}
              disabled={finished}
            >
              {value}
              <small>
                {state.colorNotes[value] === "likely"
                  ? "○"
                  : state.colorNotes[value] === "unlikely"
                    ? "×"
                    : ""}
              </small>
            </button>
          ))}
        </div>
        <div className="actions">
          <button
            className={`button secondary ${memoMode ? "active" : ""}`}
            onClick={() => setMemoMode((value) => !value)}
          >
            位置候補メモ {memoMode ? "ON" : "OFF"}
          </button>
          <button
            className="button secondary"
            onClick={() =>
              setState(
                cycleColorNote(state, state.current[state.selected] ?? 1),
              )
            }
          >
            選択色の状態メモ
          </button>
          <button
            className="button secondary"
            onClick={() => setState(clearSelected(puzzle, state))}
          >
            選択位置を消す
          </button>
          <button className="button" disabled={finished} onClick={submit}>
            この予想を判定
          </button>
        </div>
        <MessagePanel message={message} />
        <section className="mastermind-organizer">
          <h2>履歴整理</h2>
          <div className="actions organization-levels">
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <button
                className={`button secondary ${settings.organizationLevel === level ? "active" : ""}`}
                key={level}
                onClick={() => setLevel(level)}
              >
                レベル{level}
              </button>
            ))}
          </div>
          {settings.organizationLevel === 0 && (
            <p>整理表示なし。履歴を時系列で確認します。</p>
          )}
          {settings.organizationLevel >= 1 && (
            <div className="comparison-list">
              <h3>2位置以内の履歴比較</h3>
              {comparisons.length ? (
                comparisons.map((comparison) => (
                  <button
                    className="comparison-card"
                    key={`${comparison.left}-${comparison.right}`}
                    onClick={() =>
                      setState({
                        ...state,
                        pinnedGuesses: [comparison.left, comparison.right],
                      })
                    }
                  >
                    <strong>
                      {comparison.left + 1}手目 ⇔ {comparison.right + 1}手目
                    </strong>
                    <span>
                      変更位置:{" "}
                      {comparison.changed.map((i) => i + 1).join("・") ||
                        "なし"}
                    </span>
                    <span>
                      完全一致 {comparison.exactDelta >= 0 ? "+" : ""}
                      {comparison.exactDelta}／色一致{" "}
                      {comparison.misplacedDelta >= 0 ? "+" : ""}
                      {comparison.misplacedDelta}
                    </span>
                  </button>
                ))
              ) : (
                <p>比較しやすい履歴ペアはまだありません。</p>
              )}
            </div>
          )}
          {settings.organizationLevel >= 2 && (
            <div className="attention-grid">
              {attention.positions.map((group, index) => (
                <section key={index}>
                  <strong>位置 {index + 1}</strong>
                  {[...group].map(([color, data]) => (
                    <span key={color}>
                      <ColorDot
                        value={color}
                        mark={data.strength === "strong" ? "◎" : "○"}
                      />
                      <small>
                        {data.evidence.map((i) => i + 1).join("・")}手
                      </small>
                    </span>
                  ))}
                </section>
              ))}
              <p>○・◎は注目候補であり、確定情報ではありません。</p>
            </div>
          )}
          {settings.organizationLevel === 3 && (
            <div className="logical-analysis">
              <strong>選択履歴による段階整理</strong>
              <p>
                判定別履歴から最大3件を整理対象にし、重要な履歴の組み合わせを試します。
              </p>
              <p>
                選択中:{" "}
                {selectedHistories.length
                  ? selectedHistories
                      .map((index) => `${index + 1}手目`)
                      .join("・")
                  : "なし"}
              </p>
              {selectionResult && (
                <>
                  <p>整合候補: {selectionResult.candidates.length}通り</p>
                  {selectionResult.candidates.length === 1 ? (
                    <p>
                      この履歴の組み合わせで一意になります。全位置の色は「論理候補で置き換える」で確認できます。
                    </p>
                  ) : (
                    selectionResult.positionColors.map((values, index) => (
                      <p key={index}>
                        位置 {index + 1}: {values.join("・")}
                        {values.length === 1 ? " ✓" : ""}
                      </p>
                    ))
                  )}
                </>
              )}
            </div>
          )}
          {settings.organizationLevel === 4 && logicResult && (
            <div className="logical-analysis">
              <strong>整合候補: {logicResult.candidates.length}通り</strong>
              {logicResult.positionColors.map((values, index) => (
                <p key={index}>
                  位置 {index + 1}: {values.join("・")}
                  {values.length === 1 ? " ✓" : ""}
                </p>
              ))}
              {logicResult.counts.map((item) => (
                <p key={item.color}>
                  色 {item.color}: {item.min}～{item.max}個{" "}
                  {item.max === 0 ? "×" : item.min > 0 ? "✓" : ""}
                </p>
              ))}
            </div>
          )}
        </section>
        <section className="mastermind-history-groups">
          <h2>判定別履歴</h2>
          {(Object.keys(groupLabels) as (keyof typeof groupLabels)[]).map(
            (group) => {
              const items = state.guesses
                .map((guess, index) => ({ guess, index }))
                .filter((item) => classifyGuess(item.guess) === group);
              return (
                <details key={group} open={items.length > 0}>
                  <summary>
                    {groupLabels[group]}（{items.length}）
                  </summary>
                  <div className="history-card-grid">
                    {items.map((item) => renderHistory(item.guess, item.index))}
                  </div>
                </details>
              );
            },
          )}
        </section>
        <div className="actions">
          <button
            className="button secondary"
            disabled={
              !selectedHistories.length ||
              !state.positionNotes.some((notes) => notes.length)
            }
            onClick={() => {
              const result = organizeNotesFromSelection(
                puzzle,
                state,
                selectedHistories,
              );
              setSelectionResult(result.analysis);
              if (
                result.removed &&
                confirm(
                  `選択履歴から不可能な候補メモを${result.removed}件削除しますか？`,
                )
              ) {
                setState(result.state);
                setMessage(`${result.removed}件の候補メモを整理しました。`);
              } else if (!result.removed)
                setMessage("選択履歴から削除できる候補メモはありません。");
            }}
          >
            選択履歴からメモ整理
          </button>
          <button
            className="button hint"
            disabled={!selectedHistories.length}
            onClick={() => {
              const preview = organizeNotesFromSelection(
                puzzle,
                state,
                selectedHistories,
              ).analysis;
              const unique = preview.candidates.length === 1;
              if (
                !confirm(
                  `選択履歴の論理候補でメモを置き換えます。${unique ? "正解が一意になるため、全位置の色が表示されます。" : "手動で外した候補が復元される場合があります。"}ヒントを1回使用します。続けますか？`,
                )
              )
                return;
              const result = replaceNotesFromSelection(
                puzzle,
                state,
                selectedHistories,
              );
              setState(result.state);
              setSelectionResult(result.analysis);
              setMessage(
                `論理候補でメモを置き換えました。${result.counted ? "ヒントを1回使用しました。" : "同じ解析結果のためヒント回数は増えません。"}`,
              );
            }}
          >
            論理候補で置き換える
          </button>
          <button
            className="button hint"
            disabled={finished}
            onClick={() => {
              let index = state.selected;
              if (state.revealed[index] !== undefined)
                index =
                  Array.from({ length: puzzle.codeLength }, (_, i) => i).find(
                    (i) => state.revealed[i] === undefined,
                  ) ?? -1;
              const next = revealPosition(puzzle, state, index);
              setState(next);
              setMessage(
                next === state
                  ? "すべての位置が公開済みです。"
                  : `左から ${index + 1} 番目は ${puzzle.secret[index]} です。`,
              );
            }}
          >
            選択位置を公開
          </button>
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
                  checked={settings.consistencyWarning}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      consistencyWarning: event.target.checked,
                    })
                  }
                />{" "}
                過去判定との矛盾を警告
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.duplicateWarning}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      duplicateWarning: event.target.checked,
                    })
                  }
                />{" "}
                重複回答を警告
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.showExcluded}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      showExcluded: event.target.checked,
                    })
                  }
                />{" "}
                一致なし色を暗く表示
              </label>
              <p>
                パレットを右クリックすると色状態メモを切り替えます。整理レベル4と位置開示だけがヒントとして加算されます。
              </p>
            </div>
          )}
        </div>
        <GameFooter
          onBack={onBack}
          onLauncher={onLauncher}
          left={
            <button
              className="button secondary"
              onClick={() => {
                if (confirm("最初からやり直しますか？")) {
                  setState(initialGame(puzzle));
                  setLogicResult(null);
                  setMessage("最初からやり直します。");
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
