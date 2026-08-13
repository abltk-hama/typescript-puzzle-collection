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
    [focusMode, setFocusMode] = useState(false),
    [focusedDigit, setFocusedDigit] = useState<number | null>(null),
    [logicalHint, setLogicalHint] = useState<LogicalHint | null>(null),
    saved = useRef<SudokuState | undefined>(undefined),
    board = useRef<HTMLDivElement>(null),
    complete = isComplete(state),
    conflicting = useMemo(() => conflicts(state.values), [state.values]),
    digitCounts = useMemo(() => Array.from({length:9},(_,index)=>state.values.filter(value=>value===index+1).length),[state.values]),
    focusConstraints = useMemo(() => new Set(focusedDigit===null?[]:state.values.flatMap((value,index)=>value===focusedDigit?peers(index):[])),[focusedDigit,state.values]),
    hintScope = useMemo(() => new Set(logicalHint?logicalHintScope(logicalHint):[]),[logicalHint]);
  const nearUnits=useMemo(()=>nearCompleteUnits(state.values),[state.values]),
    nearCells=useMemo(()=>new Set(nearUnits.flatMap(unit=>unit.cells)),[nearUnits]),
    nearEmptyCells=useMemo(()=>new Set(nearUnits.map(unit=>unit.emptyIndex)),[nearUnits]),
    contradictoryEmptyCells=useMemo(()=>new Set(nearUnits.filter(unit=>!unit.valid).map(unit=>unit.emptyIndex)),[nearUnits]),
    removableNotes=useMemo(()=>cleanCandidateNotes(state).removed,[state]);
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
    if (next !== state) setLogicalHint(null);
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
    if (next !== state) setLogicalHint(null);
    if (next !== state) setMessage("選択マスを消去しました。");
  }
  function selectBoardCell(index:number,value:number){
    setState(selectCell(state,index));
    if(focusMode&&value){setFocusedDigit(value);return}
    if(value)return;
    const units=nearCompletionForCell(state.values,index);
    if(!units.length)return;
    const valid=units.filter(unit=>unit.valid),digits=[...new Set(valid.map(unit=>unit.missing[0]))];
    if(valid.length===units.length&&digits.length===1){
      setFocusMode(true);setFocusedDigit(digits[0]);
      const labels=valid.map(unit=>unit.kind==="row"?"行":unit.kind==="column"?"列":"3×3ブロック").join("・");
      setMessage(`${labels}で不足している数字は${digits[0]}です。入力前に配置を確認してください。`);
    }else{
      setFocusedDigit(null);
      const details=units.map(unit=>`${unit.kind==="row"?"行":unit.kind==="column"?"列":"3×3ブロック"}：${unit.missing.join("・")||"判定不能"}`).join("、");
      setMessage(`完成直前の単位で不足数字が一致しません（${details}）。入力内容を確認してください。`);
    }
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
            <button
              className={`wide sudoku-focus-toggle ${focusMode ? "active" : ""}`}
              onClick={() => {
                setFocusMode((enabled) => {
                  if (enabled) setFocusedDigit(null);
                  return !enabled;
                });
              }}
            >
              数字フォーカス {focusMode ? focusedDigit ? `ON：${focusedDigit}` : "ON" : "OFF"}
            </button>
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
                <span>{value}</span>
                <small>{digitCounts[value-1]}/9</small>
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
                  data-focus={focusedDigit!==null&&value===focusedDigit?"digit":focusedDigit!==null&&focusConstraints.has(index)?"constraint":undefined}
                  data-logical={logicalHint?.index===index?"target":hintScope.has(index)?"scope":undefined}
                  data-near={contradictoryEmptyCells.has(index)?"conflict":nearEmptyCells.has(index)?"empty":nearCells.has(index)?"unit":undefined}
                  onClick={() => selectBoardCell(index,value)}
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
            className="button secondary"
            disabled={complete||state.selected===null||Boolean(selectedValue)}
            onClick={()=>{
              const next=addCandidateNotes(state);
              setState(next);
              if(next!==state)setMessage(`選択マスへ候補 ${next.notes[next.selected!].join("、")||"なし"} をメモしました。`);
            }}
          >
            候補をメモ
          </button>
          <button
            className="button secondary"
            disabled={complete||removableNotes===0}
            onClick={()=>{
              const result=cleanCandidateNotes(state);
              setState(result.state);
              setMessage(`不要なメモを${result.removed}件削除しました。`);
            }}
          >
            メモを整理{removableNotes?`（${removableNotes}）`:""}
          </button>
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
              if(conflicting.size){setMessage("重複している数字があるため、確定候補を判定できません。");return}
              const hint=findLogicalHint(state.values);
              if(!hint){setMessage("基本的な確定候補は見つかりませんでした。候補メモを進めるか、1マス開示を利用してください。");return}
              setState(applyLogicalHint(state,hint));
              setFocusMode(true);
              setFocusedDigit(hint.digit);
              setLogicalHint(hint);
              const place=hint.kind==="naked-single"?"このマスに入る候補":hint.kind==="hidden-single-row"?"この行で置ける場所":hint.kind==="hidden-single-column"?"この列で置ける場所":"この3×3ブロックで置ける場所";
              setMessage(hint.kind==="naked-single"?`${place}は${hint.digit}だけです。`:`${place}がこのマスだけの数字は${hint.digit}です。`);
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
              if(next!==state)setLogicalHint(null);
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
