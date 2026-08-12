import { useEffect,useState,type ComponentType } from 'react'

export interface SetupProps<P>{puzzles:P[];onStart:(puzzle:P)=>void;onLauncher:()=>void}
export interface GameProps<P>{puzzle:P;onBack:()=>void;onLauncher:()=>void}
export interface GameFlowProps<P>{loadPuzzles:()=>Promise<P[]>;Setup:ComponentType<SetupProps<P>>;Game:ComponentType<GameProps<P>>;onLauncher:()=>void}

export function GameFlow<P>({loadPuzzles,Setup,Game,onLauncher}:GameFlowProps<P>){
  const[puzzles,setPuzzles]=useState<P[]>([]),[selected,setSelected]=useState<P|null>(null),[screen,setScreen]=useState<'setup'|'game'>('setup'),[error,setError]=useState('')
  useEffect(()=>{loadPuzzles().then(setPuzzles).catch((reason:unknown)=>setError(reason instanceof Error?reason.message:'問題データを読み込めません。'))},[loadPuzzles])
  if(error)return <main className="shell"><section className="panel error"><h1>読込エラー</h1><p>{error}</p><button className="button secondary" onClick={onLauncher}>ランチャーへ戻る</button></section></main>
  if(screen==='game'&&selected)return <Game puzzle={selected} onBack={()=>setScreen('setup')} onLauncher={onLauncher}/>
  return <Setup puzzles={puzzles} onStart={puzzle=>{setSelected(puzzle);setScreen('game')}} onLauncher={onLauncher}/>
}
