import { useEffect, useState } from "react";
import "./App.css";
import { findGame, gameCatalog, type GameId } from "./app/gameCatalog";
import { settingsStore } from "./common/storage/settings";

export default function App() {
  const [gameId, setGameId] = useState<GameId | null>(null),
    game = findGame(gameId);
  useEffect(() => settingsStore.set({ lastGame: gameId }), [gameId]);
  if (game) return game.render(() => setGameId(null));
  return (
    <main className="shell">
      <section className="hero-card">
        <p className="eyebrow">THINK • PLAY • RELAX</p>
        <h1>TypeScript パズルゲーム集</h1>
        <p>少し頭を使う、盤面型パズルのコレクション</p>
      </section>
      <section className="catalog">
        {gameCatalog.map((entry) => (
          <button
            key={entry.id}
            className={`game-card ${entry.cardClass ?? ""}`}
            onClick={() => setGameId(entry.id)}
          >
            <span className="game-icon">{entry.icon}</span>
            <span>
              <strong>{entry.displayName}</strong>
              <small>{entry.description}</small>
            </span>
            <b>遊ぶ →</b>
          </button>
        ))}
        <div className="coming-soon">6種類のパズルを収録しています</div>
      </section>
    </main>
  );
}
