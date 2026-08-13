import { useEffect, useMemo, useState } from "react";
import { LauncherFooter } from "../../../common/components/GameChrome";
import type { MazePuzzle } from "../domain/maze";
import { generateMaze, PROFILES } from "../generation/generate";
import { listMazeProgress, loadGeneratedPuzzles } from "../data/sessions";
const labels = { easy: "かんたん", medium: "ふつう", hard: "むずかしい" };
export function MazeSetup({
  puzzles,
  onStart,
  onLauncher,
}: {
  puzzles: MazePuzzle[];
  onStart: (p: MazePuzzle) => void;
  onLauncher: () => void;
}) {
  const [difficulty, setDifficulty] = useState<keyof typeof labels>("easy"),
    [selected, setSelected] = useState(""),
    [profile, setProfile] = useState<keyof typeof PROFILES>("medium"),
    [progress, setProgress] = useState<Set<string>>(new Set()),
    [generated, setGenerated] = useState<MazePuzzle[]>([]);
  useEffect(() => {
    Promise.all([listMazeProgress(), loadGeneratedPuzzles()]).then(
      ([sessions, items]) => {
        setProgress(new Set(sessions.map((item) => item.puzzleId)));
        setGenerated(items);
      },
    );
  }, []);
  const choices = useMemo(
      () => puzzles.filter((p) => p.difficulty === difficulty),
      [puzzles, difficulty],
    ),
    current = choices.find((p) => p.id === (selected || choices[0]?.id));
  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>迷路</h1>
          <span>入口からゴールまで道を探します</span>
        </div>
        <div className="setup-grid">
          <article className="setup-card">
            <h2>同梱問題</h2>
            <label>
              難易度
              <select
                value={difficulty}
                onChange={(event) => {
                  setDifficulty(event.target.value as keyof typeof labels);
                  setSelected("");
                }}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              問題
              <select
                value={current?.id ?? ""}
                onChange={(event) => setSelected(event.target.value)}
              >
                {choices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}（{p.width}×{p.height}）
                    {progress.has(p.id) ? "（途中）" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button"
              disabled={!current}
              onClick={() => current && onStart(current)}
            >
              ゲームを開始
            </button>
          </article>
          <article className="setup-card">
            <h2>ランダム迷路</h2>
            <p>
              深さ優先探索で完全迷路を生成します。サイズが大きいほど全体図と自動進行が役立ちます。
            </p>
            <select
              value={profile}
              onChange={(event) =>
                setProfile(event.target.value as keyof typeof PROFILES)
              }
            >
              {Object.entries(PROFILES).map(([value, data]) => (
                <option key={value} value={value}>
                  {data.label}（{data.size}×{data.size}）
                </option>
              ))}
            </select>
            <button
              className="button"
              onClick={() => onStart(generateMaze(Date.now() >>> 0, profile))}
            >
              生成して開始
            </button>
            {generated.length > 0 && (
              <>
                <h3>生成迷路の続き</h3>
                <div className="resume-list">
                  {generated.map((p) => (
                    <button
                      className="button secondary"
                      key={p.id}
                      onClick={() => onStart(p)}
                    >
                      {p.width}×{p.height}（途中）
                    </button>
                  ))}
                </div>
              </>
            )}
          </article>
        </div>
        <LauncherFooter onLauncher={onLauncher} />
      </section>
    </main>
  );
}
