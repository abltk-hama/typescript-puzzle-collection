import { useEffect, useState } from 'react'
import './App.css'
import { LightsOutGame } from './games/lights-out/ui/LightsOutGame'
import { LightsOutSetup } from './games/lights-out/ui/LightsOutSetup'
import type { LightsOutPuzzle } from './games/lights-out/domain/lightsOut'
import { loadBundledPuzzles } from './games/lights-out/data/puzzles'
import { settingsStore } from './common/storage/settings'

type Screen = 'launcher' | 'setup' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('launcher')
  const [puzzles, setPuzzles] = useState<LightsOutPuzzle[]>([])
  const [puzzle, setPuzzle] = useState<LightsOutPuzzle | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBundledPuzzles().then(setPuzzles).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '問題データを読み込めません。'))
  }, [])
  useEffect(() => { settingsStore.set({ lastGame: screen === 'launcher' ? null : 'lights_out' }) }, [screen])

  if (error) return <main className="shell"><section className="panel error"><h1>読込エラー</h1><p>{error}</p></section></main>
  if (screen === 'game' && puzzle) return <LightsOutGame puzzle={puzzle} onBack={() => setScreen('setup')} onLauncher={() => setScreen('launcher')} />
  if (screen === 'setup') return <LightsOutSetup puzzles={puzzles} onStart={(selected) => { setPuzzle(selected); setScreen('game') }} onLauncher={() => setScreen('launcher')} />
  return <main className="shell"><section className="hero-card"><p className="eyebrow">THINK • PLAY • RELAX</p><h1>Python パズルゲーム集</h1><p>少し頭を使う、盤面型パズルのコレクション</p></section><section className="catalog"><button className="game-card" onClick={() => setScreen('setup')}><span className="game-icon">✦</span><span><strong>ライツアウト</strong><small>光るマスをすべて消そう</small></span><b>遊ぶ →</b></button><div className="coming-soon">ほかのゲームは順次移植します</div></section></main>
}
