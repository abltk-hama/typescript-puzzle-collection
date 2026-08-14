import { useEffect, useMemo, useRef, useState } from "react";
import { GameFooter, MessagePanel } from "../../../common/components/GameChrome";
import { loadAssistSettings, saveAssistSettings } from "../../../common/storage/gameAssistSettings";
import {
  addCandidateNotes, analyzeHypothesis, applyHypothesisSequence,
  applyHypothesisValues, candidates, cleanCandidateNotes, clearCell,
  clearHypothesisCell, commitHypothesis, conflicts, countCompletions,
  discardHypothesis, enterHypothesisNumber, enterNumber, findLogicalHint,
  hypothesisSequences, initialSkyscraper, isComplete, isFixed, lineIndices,
  lineStatus, resetHypothesis, revealHint, selectHypothesisLine,
  startHypothesis, undoHypothesis, visibilityMarkers, workingValues,
  type Direction, type HypothesisLine, type SkyscraperPuzzle,
  type SkyscraperState,
} from "../domain/skyscraper";
import { deleteSkyscraperSession, loadSkyscraperSession, saveSkyscraperSession } from "../data/sessions";

type Phase = "loading" | "ask" | "play";
type DirectionSettings = Record<Direction, boolean>;
interface AssistSettings {
  directions: DirectionSettings;
  provisionalMarkers: boolean;
  impossibleWarnings: boolean;
  hypothesisEnabled: boolean;
}
const defaults: AssistSettings = {
  directions: { left: true, right: true, top: true, bottom: true },
  provisionalMarkers: true,
  impossibleWarnings: true,
  hypothesisEnabled: true,
};
const directionMeta: Record<Direction, { label: string; arrow: string }> = {
  left: { label: "左から", arrow: "→" }, right: { label: "右から", arrow: "←" },
  top: { label: "上から", arrow: "↓" }, bottom: { label: "下から", arrow: "↑" },
};
const lineLabel = (line: HypothesisLine) => `${line.unit + 1}${line.axis === "row" ? "行目" : "列目"}`;

export function SkyscraperGame({ puzzle, onBack, onLauncher }: { puzzle: SkyscraperPuzzle; onBack: () => void; onLauncher: () => void }) {
  const [state, setState] = useState<SkyscraperState>(() => initialSkyscraper(puzzle));
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("ゲームを開始しました。");
  const [assist, setAssist] = useState(() => loadAssistSettings("skyscraper", defaults));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedClue, setFocusedClue] = useState<{ direction: Direction; unit: number } | null>(null);
  const [pendingLineCell, setPendingLineCell] = useState<number | null>(null);
  const [sequenceLimit, setSequenceLimit] = useState(20);
  const saved = useRef<SkyscraperState | undefined>(undefined);
  const board = useRef<HTMLDivElement>(null);
  const hypothesis = state.hypothesis;
  const values = useMemo(() => workingValues(state), [state]);
  const complete = isComplete(puzzle, state);
  const hypotheticalComplete = hypothesis ? isComplete(puzzle, { ...state, values, hypothesis: null }) : false;
  const conflicting = useMemo(() => conflicts(values, puzzle.size), [values, puzzle.size]);
  const analysis = useMemo(() => hypothesis ? analyzeHypothesis(puzzle, state) : null, [hypothesis, puzzle, state]);
  const activeLine = hypothesis?.selectedLine ?? null;
  const sequences = useMemo(() => activeLine ? hypothesisSequences(puzzle, state, activeLine) : [], [activeLine, puzzle, state]);
  const removable = useMemo(() => cleanCandidateNotes(puzzle, state).removed, [puzzle, state]);
  const digitCounts = useMemo(() => Array.from({ length: puzzle.size }, (_, i) => values.filter(value => value === i + 1).length), [values, puzzle.size]);
  const markers = useMemo(() => {
    const result: Record<Direction, Map<number, "confirmed" | "provisional">> = { left: new Map(), right: new Map(), top: new Map(), bottom: new Map() };
    for (const direction of Object.keys(result) as Direction[])
      for (let unit = 0; unit < puzzle.size; unit++)
        visibilityMarkers(values, puzzle.size, direction, unit).forEach((marker, index) => result[direction].set(index, marker));
    return result;
  }, [values, puzzle.size]);

  useEffect(() => { loadSkyscraperSession(puzzle).then(found => { saved.current = found; setPhase(found ? "ask" : "play"); }).catch(() => { setMessage("保存データを読み込めないため、最初から開始します。"); setPhase("play"); }); }, [puzzle]);
  useEffect(() => {
    if (phase !== "play") return;
    if (complete) deleteSkyscraperSession(puzzle.id);
    else if (state.values.some((value, index) => value !== puzzle.givens[index]) || state.notes.some(note => note.length) || state.hintCount || state.hypothesis)
      saveSkyscraperSession(puzzle, state);
  }, [state, phase, complete, puzzle]);
  useEffect(() => saveAssistSettings("skyscraper", assist), [assist]);
  useEffect(() => { if (phase === "play") board.current?.focus(); }, [phase]);

  const selectedValue = state.selected === null ? 0 : values[state.selected];
  const used = state.selected === null ? new Set<number>() : new Set([...lineIndices(puzzle.size, "left", Math.floor(state.selected / puzzle.size)), ...lineIndices(puzzle.size, "top", state.selected % puzzle.size)].map(index => values[index]).filter(Boolean));
  function applyNumber(value: number) {
    const next = hypothesis ? enterHypothesisNumber(puzzle, state, value) : enterNumber(puzzle, state, value);
    setState(next);
    if (next !== state) { setFocusedClue(null); setMessage(hypothesis ? `${value} を仮入力しました。` : state.inputMode === "note" ? `候補 ${value} を切り替えました。` : `${value} を入力しました。`); }
  }
  function clear() {
    const next = hypothesis ? clearHypothesisCell(state) : clearCell(puzzle, state);
    setState(next); if (next !== state) setMessage(hypothesis ? "選択マスの仮入力を消去しました。" : "選択マスを消去しました。");
  }
  function keyDown(event: React.KeyboardEvent) {
    if (new RegExp(`^[1-${puzzle.size}]$`).test(event.key)) { event.preventDefault(); applyNumber(Number(event.key)); }
    else if (["Delete", "Backspace", "0"].includes(event.key)) { event.preventDefault(); clear(); }
    else if (event.key === "n" && !hypothesis) setState({ ...state, inputMode: state.inputMode === "note" ? "value" : "note" });
  }
  function chooseLine(line: HypothesisLine) {
    setState(selectHypothesisLine(state, line)); setPendingLineCell(null); setSequenceLimit(20);
    setMessage(`${lineLabel(line)}の成立する並びを候補メモから作成しました。`);
  }
  function clue(direction: Direction, unit: number) {
    const value = puzzle.clues[direction][unit]; if (!value) return <span className="skyscraper-clue empty" aria-hidden="true" />;
    const status = lineStatus(puzzle, values, direction, unit), focused = focusedClue?.direction === direction && focusedClue.unit === unit;
    return <button aria-label={`${directionMeta[direction].label} ${unit + 1}番 ${value}`} className={`skyscraper-clue ${assist.impossibleWarnings ? status : ""} ${focused ? "focused" : ""}`} onClick={() => {
      if (hypothesis) { chooseLine({ axis: direction === "left" || direction === "right" ? "row" : "column", unit }); return; }
      setFocusedClue(focused ? null : { direction, unit }); setMessage(`${directionMeta[direction].label}${unit + 1}列目：見える建物は ${value} 棟です。`);
    }}>{value}</button>;
  }

  if (phase === "loading") return <main className="shell"><section className="panel"><p>保存状態を確認しています…</p></section></main>;
  if (phase === "ask") return <main className="shell"><section className="panel resume-dialog"><h1>保存済みの進捗</h1><p>この問題には保存済みの進捗があります。</p><div className="actions"><button className="button" onClick={() => { setState(saved.current!); setMessage(saved.current?.hypothesis ? "仮説探索を含む保存済み進捗から再開しました。" : "保存済みの進捗から再開しました。"); setPhase("play"); }}>続きから</button><button className="button secondary" onClick={() => { deleteSkyscraperSession(puzzle.id); setState(initialSkyscraper(puzzle)); setPhase("play"); }}>最初から</button><button className="button secondary" onClick={onBack}>キャンセル</button></div></section></main>;

  return <main className="shell"><section className="panel"><div className="toolbar"><h1>スカイスクレーパー</h1><strong>{puzzle.title} / {puzzle.size}×{puzzle.size}</strong></div><div className="stats"><span>入力: {hypothesis ? "仮説" : state.inputMode === "value" ? "数字" : "メモ"}</span><span>ヒント: {state.hintCount}回</span></div><div className="skyscraper-play"><div className="skyscraper-keypad" aria-label="数字キーパッド">{Array.from({ length: puzzle.size }, (_, i) => i + 1).map(value => <button key={value} aria-label={`数字 ${value}`} className={selectedValue === value ? "active" : ""} disabled={complete || (!hypothesis && state.inputMode === "value" && used.has(value))} onClick={() => applyNumber(value)}><span>{value}</span><small>{digitCounts[value - 1]}/{puzzle.size}</small></button>)}<button className="wide" onClick={clear}>消去</button><button className={`wide ${state.inputMode === "note" ? "active" : ""}`} disabled={Boolean(hypothesis)} onClick={() => setState({ ...state, inputMode: state.inputMode === "note" ? "value" : "note" })}>メモ {state.inputMode === "note" ? "ON" : "OFF"}</button><div className="direction-toggles" aria-label="可視マーカー方向">{(Object.keys(directionMeta) as Direction[]).map(direction => <button key={direction} aria-pressed={assist.directions[direction]} className={`direction-${direction} ${assist.directions[direction] ? "active" : ""}`} onClick={() => setAssist({ ...assist, directions: { ...assist.directions, [direction]: !assist.directions[direction] } })}>{directionMeta[direction].label} {directionMeta[direction].arrow}</button>)}</div>{assist.hypothesisEnabled && <button className={`wide hypothesis-toggle ${hypothesis ? "active" : ""}`} aria-pressed={Boolean(hypothesis)} onClick={() => {
        if (hypothesis) { if (hypothesis.trialValues.some(Boolean) && !confirm("仮入力をすべて破棄して仮説探索を終了しますか？")) return; setState(discardHypothesis(state)); setPendingLineCell(null); setMessage("仮説探索を終了しました。"); }
        else { setState(startHypothesis(state)); setMessage("仮説探索を開始しました。マスを選んで行または列を起点にしてください。"); }
      }}>仮説探索 {hypothesis ? "ON" : "OFF"}</button>}</div><div ref={board} className={`skyscraper-board size-${puzzle.size}`} role="grid" aria-label="スカイスクレーパー盤面" tabIndex={0} onKeyDown={keyDown} style={{ gridTemplateColumns: `repeat(${puzzle.size + 2},var(--skyscraper-cell))` }}><span />{Array.from({ length: puzzle.size }, (_, unit) => <span key={`top-${unit}`}>{clue("top", unit)}</span>)}<span />{Array.from({ length: puzzle.size }, (_, row) => [<span key={`left-${row}`}>{clue("left", row)}</span>, ...Array.from({ length: puzzle.size }, (_, column) => {
        const index = row * puzzle.size + column, value = values[index], trial = Boolean(hypothesis?.trialValues[index] && !state.values[index]), focused = focusedClue ? lineIndices(puzzle.size, focusedClue.direction, focusedClue.unit).includes(index) : false, hypothesisFocused = activeLine ? lineIndices(puzzle.size, activeLine.axis === "row" ? "left" : "top", activeLine.unit).includes(index) : false;
        return <button key={index} role="gridcell" aria-label={`${row + 1}行${column + 1}列${value ? ` ${trial ? "仮 " : ""}${value}` : ""}`} className={`${state.selected === index ? "selected" : ""} ${isFixed(puzzle, state, index) ? "fixed" : ""} ${state.hinted.includes(index) ? "hinted" : ""} ${trial ? "hypothetical" : ""} ${conflicting.has(index) ? "conflict" : ""} ${focused ? "clue-focused" : ""} ${hypothesisFocused ? "hypothesis-line" : ""}`} onClick={() => { setState({ ...state, selected: index }); setFocusedClue(null); if (hypothesis) setPendingLineCell(index); }} onContextMenu={event => { event.preventDefault(); if (!hypothesis) setState({ ...state, selected: index, inputMode: "note" }); }}>{value || <span className="skyscraper-notes">{Array.from({ length: puzzle.size }, (_, i) => <i key={i}>{state.notes[index].includes(i + 1) ? i + 1 : ""}</i>)}</span>}{(Object.keys(directionMeta) as Direction[]).map(direction => { const marker = markers[direction].get(index); return assist.directions[direction] && marker && (assist.provisionalMarkers || marker === "confirmed") ? <i key={direction} aria-hidden="true" className={`visibility-dot ${direction} ${marker}`} /> : null; })}</button>;
      }), <span key={`right-${row}`}>{clue("right", row)}</span>])}<span />{Array.from({ length: puzzle.size }, (_, unit) => <span key={`bottom-${unit}`}>{clue("bottom", unit)}</span>)}<span /></div></div><MessagePanel message={complete ? `完成しました！（ヒント使用 ${state.hintCount}回）` : hypotheticalComplete ? "仮説盤面が完成条件を満たしました。採用前に内容を確認してください。" : message} logKey={`skyscraper:${puzzle.id}`} />

    {hypothesis && <section className="hypothesis-panel" aria-label="仮説探索"><div className="hypothesis-summary"><strong>仮説探索</strong><span>段階 {hypothesis.history.length}</span><span>仮入力 {hypothesis.trialValues.filter(Boolean).length}マス</span></div>{pendingLineCell !== null && <div className="hypothesis-line-choice"><strong>{Math.floor(pendingLineCell / puzzle.size) + 1}行{pendingLineCell % puzzle.size + 1}列を起点にする</strong><div className="actions"><button className="button secondary" onClick={() => chooseLine({ axis: "row", unit: Math.floor(pendingLineCell / puzzle.size) })}>この行から考える</button><button className="button secondary" onClick={() => chooseLine({ axis: "column", unit: pendingLineCell % puzzle.size })}>この列から考える</button><button className="button secondary" onClick={() => setPendingLineCell(null)}>キャンセル</button></div></div>}{activeLine && <div className="hypothesis-sequences"><h3>{lineLabel(activeLine)}の成立する並び：{sequences.length}通り</h3>{sequences.length ? <div className="sequence-list">{sequences.slice(0, sequenceLimit).map((sequence, index) => <button key={`${sequence.join("-")}-${index}`} aria-label={`並び ${sequence.join("・")}`} className="sequence-card" onClick={() => { const next = applyHypothesisSequence(puzzle, state, activeLine, sequence), nextAnalysis = analyzeHypothesis(puzzle, next); setState(next); setPendingLineCell(null); setMessage(nextAnalysis.contradiction ? `${lineLabel(nextAnalysis.contradiction)}を満たす並びがなく、仮説が矛盾しました。` : `${lineLabel(activeLine)}へ ${sequence.join("・")} を仮入力しました。`); }}>{sequence.map(value => <span key={value}>{value}</span>)}</button>)}</div> : <p role="alert">候補メモと現在の仮入力を満たす並びがありません。</p>}{sequenceLimit < sequences.length && <button className="button secondary" onClick={() => setSequenceLimit(limit => limit + 20)}>さらに表示</button>}</div>}{analysis?.contradiction && <div className="hypothesis-contradiction" role="alert"><strong>仮説が矛盾しています</strong><p>{lineLabel(analysis.contradiction)}を満たす並びがありません。</p></div>}{hypothesis.history.length > 0 && analysis && !analysis.contradiction && analysis.forced.length > 0 && <div className="hypothesis-forced"><h3>候補伝播による確定候補：{analysis.forced.length}マス</h3><div className="forced-list">{analysis.forced.slice(0, 12).map(item => <button key={item.index} className="button secondary" onClick={() => { setState(applyHypothesisValues(state, [item])); setMessage(`${Math.floor(item.index / puzzle.size) + 1}行${item.index % puzzle.size + 1}列へ ${item.value} を仮入力しました。`); }}>{Math.floor(item.index / puzzle.size) + 1}行{item.index % puzzle.size + 1}列：{item.value}</button>)}</div><button className="button secondary" onClick={() => { setState(applyHypothesisValues(state, analysis.forced)); setMessage(`確定候補 ${analysis.forced.length}マスを仮入力しました。`); }}>すべて仮入力</button></div>}<div className="actions hypothesis-actions"><button className="button secondary" disabled={!hypothesis.history.length} onClick={() => { setState(undoHypothesis(state)); setMessage("仮説を1段階戻しました。"); }}>1段階戻る</button><button className="button secondary" disabled={!hypothesis.trialValues.some(Boolean)} onClick={() => { setState(resetHypothesis(state)); setMessage("仮説の起点へ戻りました。"); }}>起点へ戻る</button><button className="button hint" onClick={() => { const possible = countCompletions(puzzle, state) > 0; setState({ ...state, hintCount: state.hintCount + 1 }); setMessage(possible ? "現在の仮説と両立する完成盤があります。" : "現在の仮説から完成できません。"); }}>全体矛盾を確認</button><button className="button" disabled={Boolean(analysis?.contradiction) || !hypothesis.trialValues.some(Boolean)} onClick={() => { if (confirm(`仮入力した${hypothesis.trialValues.filter(Boolean).length}マスを確定しますか？`)) { setState(commitHypothesis(state)); setPendingLineCell(null); setMessage("仮説を確定盤面へ採用しました。"); } }}>仮説を採用</button><button className="button secondary" onClick={() => { setState(discardHypothesis(state)); setPendingLineCell(null); setMessage("仮説をすべて破棄しました。"); }}>すべて破棄</button></div></section>}

    <div className="assist-settings"><button className="button secondary" onClick={() => setSettingsOpen(open => !open)}>補助設定{settingsOpen ? "を閉じる" : "を開く"}</button>{settingsOpen && <div className="assist-settings-panel"><label><input type="checkbox" checked={assist.provisionalMarkers} onChange={event => setAssist({ ...assist, provisionalMarkers: event.target.checked })} /> 空欄より奥の暫定点を表示</label><label><input type="checkbox" checked={assist.impossibleWarnings} onChange={event => setAssist({ ...assist, impossibleWarnings: event.target.checked })} /> 成立不能なヒントを警告</label><label><input type="checkbox" checked={assist.hypothesisEnabled} onChange={event => { setAssist({ ...assist, hypothesisEnabled: event.target.checked }); if (!event.target.checked) { setState(discardHypothesis(state)); setPendingLineCell(null); } }} /> 仮説探索機能</label><p>塗りつぶし点は確定、白抜き点は空欄を含む暫定表示です。</p></div>}</div><h2 className="action-heading">入力補助</h2><div className="actions"><button className="button secondary" disabled={Boolean(hypothesis) || state.selected === null || Boolean(selectedValue)} onClick={() => { const next = addCandidateNotes(puzzle, state); setState(next); if (next !== state) setMessage(`候補 ${next.notes[next.selected!].join("・") || "なし"} をメモしました。`); }}>候補をメモ</button><button className="button secondary" disabled={Boolean(hypothesis) || !removable} onClick={() => { const result = cleanCandidateNotes(puzzle, state); setState(result.state); setMessage(`不要なメモを${result.removed}件削除しました。`); }}>メモを整理{removable ? `（${removable}）` : ""}</button></div><h2 className="action-heading">ヒント</h2><div className="actions"><button className="button hint" disabled={Boolean(hypothesis) || state.selected === null || Boolean(selectedValue)} onClick={() => { if (state.selected === null) return; const found = candidates(puzzle, state.values, state.selected); setState({ ...state, hintCount: state.hintCount + 1 }); setMessage(`選択マスの候補: ${found.join("・") || "なし"}`); }}>選択マスの候補</button><button className="button hint" disabled={Boolean(hypothesis)} onClick={() => { const found = findLogicalHint(puzzle, state.values); setState({ ...state, selected: found?.index ?? state.selected, hintCount: state.hintCount + 1 }); setMessage(found ? `${Math.floor(found.index / puzzle.size) + 1}行${found.index % puzzle.size + 1}列は ${found.value} に確定できます。` : "基本的な確定候補は見つかりませんでした。"); }}>確定候補を探す</button><button className="button hint" disabled={Boolean(hypothesis)} onClick={() => { const next = revealHint(puzzle, state); setState(next); setMessage(next === state ? "開示できるマスはありません。" : `${Math.floor(next.selected! / puzzle.size) + 1}行${next.selected! % puzzle.size + 1}列を開示しました。`); }}>1マス開示</button></div><GameFooter onBack={onBack} onLauncher={onLauncher} left={<button className="button secondary" onClick={() => { if (confirm("盤面を初期状態に戻しますか？")) { setState(initialSkyscraper(puzzle)); setPendingLineCell(null); deleteSkyscraperSession(puzzle.id); setMessage("盤面を初期状態に戻しました。"); } }}>リセット</button>} /></section></main>;
}
