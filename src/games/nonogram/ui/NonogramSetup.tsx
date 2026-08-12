import { useEffect, useMemo, useRef, useState } from "react";
import { LauncherFooter } from "../../../common/components/GameChrome";
import type { NonogramPuzzle } from "../domain/nonogram";
import { listNonogramProgress, loadGeneratedPuzzles } from "../data/sessions";
import { startGeneration, type GenerationTask } from "../generation/client";
import { PROFILES } from "../generation/generate";
const labels = {
  easy: "かんたん",
  medium: "ふつう",
  hard: "むずかしい",
} as const;
const selectionKey = "nonogram-setup-selection";
export function NonogramSetup({
  puzzles,
  onStart,
  onLauncher,
}: {
  puzzles: NonogramPuzzle[];
  onStart: (p: NonogramPuzzle) => void;
  onLauncher: () => void;
}) {
  const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem(selectionKey) ?? "{}") as {
          size?: 5 | 10;
          difficulty?: keyof typeof labels;
          puzzle?: string;
        };
      } catch {
        return {};
      }
    })(),
    [size, setSize] = useState<5 | 10>(stored.size ?? 5),
    [difficulty, setDifficulty] = useState<keyof typeof labels>(
      stored.difficulty ?? "easy",
    ),
    [selected, setSelected] = useState(stored.puzzle ?? ""),
    [profile, setProfile] = useState<keyof typeof PROFILES>("medium"),
    [progress, setProgress] = useState<Set<string>>(new Set()),
    [generated, setGenerated] = useState<NonogramPuzzle[]>([]),
    [generationProgress, setGenerationProgress] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    task = useRef<GenerationTask | null>(null);
  useEffect(() => {
    Promise.all([listNonogramProgress(), loadGeneratedPuzzles()]).then(
      ([sessions, items]) => {
        setProgress(new Set(sessions.map((item) => item.puzzleId)));
        setGenerated(items);
      },
    );
  }, []);
  useEffect(() => () => task.current?.cancel(), []);
  const difficulties = useMemo(
      () => [
        ...new Set(
          puzzles.filter((p) => p.width === size).map((p) => p.difficulty),
        ),
      ],
      [puzzles, size],
    ),
    effectiveDifficulty = difficulties.includes(difficulty)
      ? difficulty
      : (difficulties[0] ?? "easy"),
    choices = puzzles.filter(
      (p) => p.width === size && p.difficulty === effectiveDifficulty,
    ),
    current = choices.find((p) => p.id === (selected || choices[0]?.id));
  useEffect(() => {
    localStorage.setItem(
      selectionKey,
      JSON.stringify({
        size,
        difficulty: effectiveDifficulty,
        puzzle: current?.id ?? "",
      }),
    );
  }, [size, effectiveDifficulty, current?.id]);
  function generate() {
    setMessage("");
    setGenerationProgress(0);
    task.current = startGeneration(size, profile, setGenerationProgress);
    task.current.promise
      .then((puzzle) => {
        task.current = null;
        setGenerationProgress(null);
        onStart(puzzle);
      })
      .catch((error) => {
        task.current = null;
        setGenerationProgress(null);
        setMessage(
          error instanceof Error ? error.message : "生成に失敗しました。",
        );
      });
  }
  return (
    <main className="shell">
      <section className="panel">
        <div className="toolbar">
          <h1>ノノグラム</h1>
          <span>数字を手がかりに絵を完成させます</span>
        </div>
        <div className="setup-grid">
          <article className="setup-card">
            <h2>同梱問題</h2>
            <label>
              サイズ
              <select
                value={size}
                onChange={(event) => {
                  setSize(Number(event.target.value) as 5 | 10);
                  setSelected("");
                }}
              >
                <option value="5">5×5</option>
                <option value="10">10×10</option>
              </select>
            </label>
            <label>
              難易度
              <select
                value={effectiveDifficulty}
                onChange={(event) => {
                  setDifficulty(event.target.value as keyof typeof labels);
                  setSelected("");
                }}
              >
                {difficulties.map((value) => (
                  <option key={value} value={value}>
                    {labels[value]}
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
                    {p.title}
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
            <h2>抽象図形の自動生成</h2>
            <p>
              一意解を確認して生成します。難易度はソルバー指標による推定です。
            </p>
            <select
              value={profile}
              disabled={generationProgress !== null}
              onChange={(event) =>
                setProfile(event.target.value as keyof typeof PROFILES)
              }
            >
              {Object.entries(PROFILES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {generationProgress === null ? (
              <button className="button" onClick={generate}>
                生成して開始
              </button>
            ) : (
              <>
                <progress max="100" value={generationProgress} />
                <span>{generationProgress}%</span>
                <button
                  className="button secondary"
                  onClick={() => task.current?.cancel()}
                >
                  生成をキャンセル
                </button>
              </>
            )}
            {message && <p role="alert">{message}</p>}
            {generated.length > 0 && (
              <>
                <h3>生成問題の続き</h3>
                <div className="resume-list">
                  {generated.map((p) => (
                    <button
                      className="button secondary"
                      key={p.id}
                      onClick={() => onStart(p)}
                    >
                      {p.width}×{p.height} / {labels[p.difficulty]}
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
