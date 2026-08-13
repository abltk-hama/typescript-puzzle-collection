import { useEffect, useMemo, useState } from "react";
import type { LightsOutPuzzle, LightsOutState, Position } from "../domain/lightsOut";
import { affectedIndices, applyPreview, effectiveMoveCount, initialGame, isComplete, nextHint, oddPositions, positionKey, press, previewCells, undo } from "../domain/lightsOut";
import { deleteLightsSession, loadLightsSession, saveLightsSession } from "../data/sessions";
import { GameFooter, MessagePanel } from "../../../common/components/GameChrome";
import { loadAssistSettings, saveAssistSettings } from "../../../common/storage/gameAssistSettings";

type Horizon=0|1|2|3|-1;
interface LightsAssistSettings { horizon:Horizon; includePreviewAttempts:boolean; showImpact:boolean; showParity:boolean; showLitCount:boolean }
const defaults:LightsAssistSettings={horizon:1,includePreviewAttempts:true,showImpact:true,showParity:false,showLitCount:true};

export function LightsOutGame({puzzle,onBack,onLauncher}:{puzzle:LightsOutPuzzle;onBack:()=>void;onLauncher:()=>void}){
  const[state,setState]=useState<LightsOutState>(()=>initialGame(puzzle)),
    [message,setMessage]=useState("ゲームを開始しました。"),
    [ready,setReady]=useState(false),
    [preview,setPreview]=useState<Position[]>([]),
    [hovered,setHovered]=useState<Position|null>(null),
    [settings,setSettings]=useState(()=>loadAssistSettings("lights_out",defaults)),
    [settingsOpen,setSettingsOpen]=useState(false);
  const complete=isComplete(state),
    displayed=useMemo(()=>previewCells(state.cells,preview),[state.cells,preview]),
    effective=effectiveMoveCount(state),
    parity=useMemo(()=>new Set(oddPositions(state.history).map(positionKey)),[state.history]),
    impact=useMemo(()=>new Set(settings.showImpact?(preview.length?affectedIndices(preview.at(-1)!):hovered?affectedIndices(hovered):[]):[]),[preview,hovered,settings.showImpact]),
    lit=state.cells.filter(Boolean).length,
    previewLit=displayed.filter(Boolean).length;

  useEffect(()=>{loadLightsSession(puzzle).then(saved=>{if(saved&&confirm("保存済みの進捗があります。続きから再開しますか？")){setState(saved);setMessage("保存済みの進捗から再開しました。")}else if(saved)deleteLightsSession(puzzle.id)}).catch(()=>setMessage("保存データを読み込めないため、最初から開始します。")).finally(()=>setReady(true))},[puzzle]);
  useEffect(()=>{if(!ready)return;if(complete||(!state.history.length&&!state.hintCount&&!state.attemptCount))deleteLightsSession(puzzle.id);else saveLightsSession(puzzle,state)},[state,complete,puzzle,ready]);
  useEffect(()=>saveAssistSettings("lights_out",settings),[settings]);

  function choose(position:Position){
    if(complete)return;
    if(settings.horizon===0){const next=press(state,position);setState(next);setMessage(isComplete(next)?completionMessage(next):"マスを押しました。");return}
    if(settings.horizon===1){const same=preview.length===1&&positionKey(preview[0])===positionKey(position);if(same)return;setPreview([position]);if(settings.includePreviewAttempts)setState(current=>({...current,attemptCount:current.attemptCount+1}));setMessage("1手先をプレビューしています。");return}
    if(settings.horizon!==-1&&preview.length>=settings.horizon){setMessage(`${settings.horizon}手までプレビュー済みです。戻すか適用してください。`);return}
    setPreview(current=>[...current,position]);if(settings.includePreviewAttempts)setState(current=>({...current,attemptCount:current.attemptCount+1}));setMessage(`${preview.length+1}手目を連鎖プレビューへ追加しました。`)
  }
  function completionMessage(next:LightsOutState){return`完成しました！ 実効手数 ${effectiveMoveCount(next)}手／試行 ${next.attemptCount}回／試行差 ${next.attemptCount-effectiveMoveCount(next)}回／ヒント ${next.hintCount}回`}
  function clearPreview(){setPreview([]);setMessage("プレビューをクリアしました。")}
  function applyCurrentPreview(){if(!preview.length)return;const effectivePreview=oddPositions(preview),removed=preview.length-effectivePreview.length,next=applyPreview(state,preview,!settings.includePreviewAttempts);setState(next);setPreview([]);setMessage(isComplete(next)?completionMessage(next):removed?`プレビューを適用し、相殺された${removed}手を除外しました。`:`プレビュー${effectivePreview.length}手を適用しました。`)}

  return <main className="shell"><section className="panel">
    <div className="toolbar"><h1>ライツアウト</h1><strong>{puzzle.title}</strong></div>
    <div className="stats"><span>実効手数: {effective}</span><span>試行: {state.attemptCount}回{settings.includePreviewAttempts?"（プレビュー込み）":""}</span>{settings.showLitCount&&<span>点灯: {lit}{preview.length?` → ${previewLit}`:""}</span>}<span>ヒント: {state.hintCount}回</span></div>
    <div className="board-wrap"><div className="lights-board" role="grid" aria-label="ライツアウト盤面">{displayed.map((isLit,index)=>{const position={row:Math.floor(index/5),column:index%5},key=positionKey(position),hinted=state.hint?.row===position.row&&state.hint.column===position.column,order=preview.map(positionKey).map((value,i)=>value===key?i+1:0).filter(Boolean);return <button key={index} className={`cell ${isLit?"lit":""} ${hinted?"hinted":""} ${impact.has(index)?"preview-impact":""} ${displayed[index]!==state.cells[index]?"preview-changed":""} ${settings.showParity&&parity.has(key)?"parity":""}`} aria-label={`${position.row+1}行${position.column+1}列 ${isLit?"点灯":"消灯"}`} onClick={()=>choose(position)} onMouseEnter={()=>setHovered(position)} onMouseLeave={()=>setHovered(null)} disabled={complete}>{order.length?<span className="preview-order">{order.join("·")}</span>:null}</button>})}</div></div>
    <MessagePanel message={complete?completionMessage(state):message}/>
    {preview.length>0&&<div className="actions preview-actions"><button className="button secondary" onClick={()=>{setPreview(current=>current.slice(0,-1));setMessage("プレビューを1手戻しました。")}}>プレビューを1手戻す</button><button className="button secondary" onClick={clearPreview}>クリア</button><button className="button" onClick={applyCurrentPreview}>実際に適用</button></div>}
    <div className="assist-settings"><button className="button secondary" onClick={()=>setSettingsOpen(open=>!open)}>補助設定{settingsOpen?"を閉じる":"を開く"}</button>{settingsOpen&&<div className="assist-settings-panel">
      <label>プレビューホライゾン <select value={settings.horizon} onChange={event=>{setPreview([]);setSettings({...settings,horizon:Number(event.target.value) as Horizon})}}><option value={0}>OFF</option><option value={1}>1手</option><option value={2}>2手</option><option value={3}>3手</option><option value={-1}>無制限</option></select></label>
      <label><input type="checkbox" checked={settings.includePreviewAttempts} onChange={event=>setSettings({...settings,includePreviewAttempts:event.target.checked})}/> 試行回数にプレビューを含める</label>
      <label><input type="checkbox" checked={settings.showImpact} onChange={event=>setSettings({...settings,showImpact:event.target.checked})}/> 影響範囲を表示</label>
      <label><input type="checkbox" checked={settings.showParity} onChange={event=>setSettings({...settings,showParity:event.target.checked})}/> 押下Parityマーカーを表示</label>
      <label><input type="checkbox" checked={settings.showLitCount} onChange={event=>setSettings({...settings,showLitCount:event.target.checked})}/> 点灯数を表示</label>
      <p>プレビューは保存されません。点灯数が減る操作が正解に近づくとは限りません。</p>
    </div>}</div>
    <h2 className="action-heading">操作・ヒント</h2><div className="actions"><button className="button secondary" disabled={!state.history.length||complete||preview.length>0} onClick={()=>{setState(undo(state));setMessage("正式操作を一手戻しました。")}}>一手戻す</button><button className="button secondary" onClick={()=>{if(confirm("最初からやり直しますか？")){setState(initialGame(puzzle));setPreview([]);setMessage("最初からやり直します。")}}}>リセット</button><button className="button hint" disabled={complete} onClick={()=>{setPreview([]);const next=nextHint(puzzle,state);setState(next);setMessage(next===state?"同じ盤面のため、表示中のヒントを維持します。":"緑の枠のマスを押してください。")}}>押すマスを表示</button></div>
    <GameFooter onBack={onBack} onLauncher={onLauncher}/>
  </section></main>
}
